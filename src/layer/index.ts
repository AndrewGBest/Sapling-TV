// Entry point of the page-side layer. Runs in the preload's isolated world:
// it shares the DOM with the site but not its JavaScript, so the site cannot
// tamper with it and it does not modify the site's own scripts.
import { isDirection, type Action, type BridgeMessage, type Direction, type LayerOptions } from '../shared/actions';
import { firstMatch, type SiteAdapter } from './adapter/adapter';
import { buildOutline, sanitizeUrl } from './diagnostics/outline';
import { installPurchaseGuard } from './guard/purchase-guard';
import { startPolling } from './input/gamepad';
import { keyToAction, type Mode } from './input/keys';
import { aboutTitle, HELP, NOTICE } from '../shared/about';
import { isSecretField, oskPlacement, OskModel } from '../shared/osk';
import { InjectedKeys, isNativePlayerKey, playerKeyFor, playerKeyInfo, type PlayerKey } from '../shared/player-keys';
import { findMainVideo, isPlayerActive, playerScope } from './player';
import { coveredByScreen, edgeControl, isFrameTarget, isVisible, openDialog, rowOf, SpatialNavigator } from './spatial/navigator';
import { HOST_TAG, Overlay } from './ui/overlay';
import { installSpikeProbes } from './spike';

export interface LayerDeps {
  doc: Document;
  options: LayerOptions;
  adapter: SiteAdapter;
  send: (msg: BridgeMessage) => void;
}

const GENERIC_SEARCH = ['input[type="search"]', '[role="search"] input', 'input[name*="search" i]', 'input[aria-label*="search" i]'];

function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    return !['button', 'submit', 'checkbox', 'radio', 'range', 'reset', 'file', 'image', 'color'].includes(el.type);
  }
  return (el as HTMLElement).isContentEditable === true;
}

export interface Layer {
  dispatch: (a: Action) => void;
  /** Show a short message from the shell, for example that a navigation was refused. */
  notice: (text: string) => void;
  /** The app's window stopped being the one in front: pause what is playing. */
  away: () => void;
  /** The layer in a frame of this page ran out of controls in a direction: carry on from the frame. */
  frameEdge: (dir: unknown) => void;
  /** The layer in a frame of this page could not get the user out with Back: take the keys and go back. */
  leaveFrame: () => void;
  stop: () => void;
}

export function startLayer({ doc, options, adapter, send }: LayerDeps): Layer {
  const view = doc.defaultView;
  if (!view) throw new Error('layer needs a window');

  /** This layer runs in a frame of the page, not the page itself. */
  const framed = options.frame === true;
  const isFrameEl = (el: Element | null): boolean => el?.tagName === 'IFRAME';
  /**
   * This frame shows nothing (seen on the live site: the sign-in form keeps a
   * zero-height frame from the account host and puts the keys on a hidden
   * field in it). Nothing in it can be navigated; every key goes back to the
   * frame around it.
   */
  const collapsed = (): boolean => framed && (view.innerHeight < 20 || view.innerWidth < 20);
  /** The keys are with a frame inside this document; its own layer handles them. */
  const keysInFrame = (): boolean => isFrameEl(doc.activeElement);

  const playerRoots = adapter.selectors.playerRoot;
  const inPlayer = (): boolean => isPlayerActive(doc, playerRoots);
  /** While the player is open, focus stays among its own controls. */
  const scope = (): Element | null => {
    // An open hover menu lies over the page; what is underneath is not reachable until it is closed.
    if (hoverHost?.isConnected) return hoverHost;
    // A pop-up the page opened in front of everything: only it can be reached.
    const dialog = openDialog(doc);
    if (dialog) return dialog;
    if (!inPlayer()) return null;
    const v = findMainVideo(doc, playerRoots);
    return v ? playerScope(v, playerRoots) : null;
  };

  const overlay = new Overlay(doc);
  /** A scripted run never types a password or a one-time code (Hard rule 9). A person may. */
  const keyboardBarred = (el: Element): boolean =>
    options.automation && isSecretField(el.getAttribute('type'), el.getAttribute('autocomplete'));
  const nav = new SpatialNavigator(doc, {
    extraFocusable: adapter.selectors.extraFocusable,
    ignoreWithin: HOST_TAG,
    onFocusChange: (el) => {
      // No ring around a whole frame: the layer inside it draws its own.
      overlay.track(isFrameEl(el) ? null : el);
      if (!el || !isTextEntry(el)) return;
      if (keyboardBarred(el)) return;
      openOsk(el);
    },
    scope,
    initial: () => (inPlayer() || openDialog(doc) ? null : firstMatch(doc, adapter.selectors.initialFocus)),
    skip: [...adapter.selectors.rowPrev, ...adapter.selectors.rowNext, ...adapter.selectors.notFocusable],
  });

  // Some menus open only when the pointer rests on their button. If Enter on
  // a button that says it is collapsed leaves it collapsed, the shell is asked
  // to put the pointer there. The pointer is taken away again on Back, or
  // when focus leaves the button and whatever it opened.
  let hoverHost: Element | null = null;
  let hoverTrigger: Element | null = null;
  let hoverTimer: number | undefined;
  const unhover = (): void => {
    if (!hoverHost) return;
    hoverHost = null;
    ignorePointerUntil = Date.now() + 500;
    send({ kind: 'hover', x: 1, y: 1 });
  };
  const hoverOn = (target: Element): void => {
    // A frame's coordinates are not the window's; no pointer help in frames.
    if (framed) return;
    const r = target.getBoundingClientRect();
    hoverHost = target.parentElement ?? target;
    hoverTrigger = target;
    ignorePointerUntil = Date.now() + 500;
    send({ kind: 'hover', x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 });
  };
  const hoverIfStillCollapsed = (target: Element): void => {
    if (target.getAttribute('aria-expanded') !== 'false') return;
    const page = view.location.href;
    view.clearTimeout(hoverTimer);
    hoverTimer = view.setTimeout(() => {
      // Not if the click went somewhere: the menu belongs to the page that was left.
      if (view.location.href !== page) return;
      if (target.isConnected && target.getAttribute('aria-expanded') === 'false') hoverOn(target);
    }, 300);
  };
  /**
   * A link that is also the button of a collapsed menu: Enter opens the menu
   * instead of following the link, so the menu's entries can be reached. The
   * menu is open after that, and Enter on the link follows it as usual.
   */
  const opensMenuFirst = (target: Element): boolean =>
    !framed && target instanceof HTMLAnchorElement && target.getAttribute('aria-expanded') === 'false' && hoverHost === null;

  // Left or right with nowhere to go: press the strip's own arrow, if the
  // adapter knows it. A carousel that swaps slides leaves focus on something
  // no longer shown, so focus then moves to the new slide.
  let edgeTimer: number | undefined;
  const whollyOnScreenX = (el: Element): boolean => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.right <= view.innerWidth;
  };
  const moveInPage = (dir: Direction): void => {
    let moved = nav.move(dir);
    // Sideways out of an open menu: close it and carry on along the bar.
    if (!moved && hoverHost && (dir === 'left' || dir === 'right')) {
      const trigger = hoverTrigger;
      unhover();
      if (trigger?.isConnected) nav.focus(trigger);
      moved = nav.move(dir);
    }
    if (moved) return;
    const from = nav.focused;
    if (!from) return;
    const hit =
      dir === 'left' || dir === 'right'
        ? edgeControl(from, dir === 'left' ? adapter.selectors.rowPrev : adapter.selectors.rowNext, view)
        : null;
    if (!hit) {
      // Nowhere to go: say so, rather than seeming not to have heard the key.
      overlay.feedback(dir);
      // In a frame, the page around it may have somewhere to go.
      if (framed) send({ kind: 'frameEdge', dir });
      return;
    }
    (hit.control as HTMLElement).click();
    view.clearTimeout(edgeTimer);
    if (dir !== 'left' && dir !== 'right') return;
    // Once the strip has settled: if what had focus is no longer wholly on
    // screen (a carousel swapped its slide, or a strip scrolled the card out
    // of sight), focus the first control now showing on the side moved to.
    const settle = (): void => {
      const f = nav.focused;
      if (f && isVisible(f, view) && whollyOnScreenX(f)) return;
      if (!nav.focusAfterTurn(hit.container, dir)) nav.focusFirstIn(hit.container);
    };
    // A strip that scrolls smoothly takes longer than a fixed wait (seen on
    // the live site), so wait for it to stop, with a timer in case it never says.
    const strip = rowOf(from, view);
    if (strip && 'onscrollend' in view) {
      let done = false;
      const finish = (): void => {
        if (done) return;
        done = true;
        strip.removeEventListener('scrollend', finish);
        view.clearTimeout(edgeTimer);
        settle();
      };
      strip.addEventListener('scrollend', finish);
      edgeTimer = view.setTimeout(finish, 1500);
    } else {
      edgeTimer = view.setTimeout(settle, 700);
    }
  };

  /**
   * True while the user is on one of the player's own controls (reached with
   * up or down). The controls hide themselves after a while; focus is dropped
   * when that happens, which returns the keys to playback.
   */
  const onPlayerControl = (): boolean => {
    const f = nav.focused;
    // Outside the player this must answer without touching focus: it is also
    // asked by timers, and clearing here would drop focus on a browse page.
    if (!f || !inPlayer()) return false;
    if (scope()?.contains(f) && isVisible(f, view)) return true;
    nav.clear();
    return false;
  };

  // On-screen keyboard: shown when layer focus lands on a text field, so a
  // remote can type. It types through the shell, like a real keyboard would.
  const osk = new OskModel();
  let oskOpen = false;
  let aboutOpen = false;
  let oskSubmit = 'enter';
  let oskAtTop = false;
  const drawOsk = (): void => overlay.keyboard(oskOpen ? osk.rows : null, { row: osk.row, index: osk.index }, oskSubmit, oskAtTop);
  const isSearchField = (el: Element): boolean => {
    try {
      return el.matches([...adapter.selectors.searchInput, ...GENERIC_SEARCH].join(','));
    } catch {
      return false;
    }
  };
  const openOsk = (field: Element): void => {
    if (!oskOpen) osk.reset();
    // The key says what it does: it only searches in a search field.
    oskSubmit = isSearchField(field) ? 'search' : 'enter';
    // The keyboard must not cover what is being typed. A field in the middle
    // of the screen is brought to the top first; if the page cannot scroll
    // that far, the keyboard takes whichever side the field is not on.
    const place = (): 'bottom' | 'top' | 'scroll' => {
      const r = field.getBoundingClientRect();
      return oskPlacement(r.top, r.bottom, view.innerHeight);
    };
    let where = place();
    if (where === 'scroll') {
      field.scrollIntoView({ block: 'start', behavior: 'instant' });
      where = place();
      if (where === 'scroll') {
        const r = field.getBoundingClientRect();
        where = (r.top + r.bottom) / 2 > view.innerHeight / 2 ? 'top' : 'bottom';
      }
    }
    oskAtTop = where === 'top';
    oskOpen = true;
    drawOsk();
  };
  const closeOsk = (): void => {
    if (!oskOpen) return;
    oskOpen = false;
    drawOsk();
  };
  const pressOsk = (): void => {
    const key = osk.key;
    if (osk.switchPage()) {
      drawOsk();
      return;
    }
    if (key.kind === 'char' || key.kind === 'space') {
      send({ kind: 'typeText', text: key.text ?? '' });
      return;
    }
    const name = key.kind === 'backspace' ? 'backspace' : 'enter';
    const info = playerKeyInfo(name);
    if (!info) return;
    injected.expect(info.domKey, Date.now());
    send({ kind: 'playerKey', key: name });
    if (key.kind === 'submit') closeOsk();
  };

  const mode = (): Mode => {
    if (collapsed()) return 'browse';
    if (oskOpen) {
      // The keyboard only makes sense while its field still has focus.
      if (isTextEntry(doc.activeElement)) return 'browse';
      closeOsk();
    }
    if (isTextEntry(doc.activeElement)) return 'text';
    if (!inPlayer()) return 'browse';
    return onPlayerControl() ? 'browse' : 'player';
  };

  // Player control is a real key press made by the shell, so the site's own
  // player decides what it does (it may refuse a seek during an advertisement).
  const injected = new InjectedKeys();
  const pressKey = (key: PlayerKey): void => {
    const info = playerKeyInfo(key);
    if (!info) return;
    injected.expect(info.domKey, Date.now());
    send({ kind: 'playerKey', key });
  };
  const pressPlayerKey = (key: PlayerKey): void => {
    if (inPlayer()) pressKey(key);
  };

  /** Moves focus into a pop-up that has opened, if it is not there already. */
  let openToggle: { label: HTMLLabelElement; input: HTMLInputElement } | null = null;
  let beforeDialog: Element | null = null;
  let dialogTimer: number | undefined;
  const enterDialog = (): boolean => {
    const dialog = openDialog(doc);
    if (!dialog) return false;
    const f = nav.focused;
    if (!f || !dialog.contains(f)) {
      beforeDialog = f;
      nav.focusFirstIn(dialog);
    }
    return true;
  };
  /** After asking a pop-up to close: once it has gone, focus returns to what opened it. */
  const leaveDialog = (): void => {
    view.clearTimeout(dialogTimer);
    dialogTimer = view.setTimeout(() => {
      if (openDialog(doc)) return;
      const back = beforeDialog;
      beforeDialog = null;
      if (back?.isConnected && isVisible(back, view)) nav.focus(back);
    }, 600);
  };

  /** A pop-up that closed from inside a frame: focus returns to what opened it. */
  const restoreAfterDialog = (): void => {
    if (!beforeDialog || openDialog(doc)) return;
    const opener = beforeDialog;
    beforeDialog = null;
    const f = nav.focused;
    if ((!f || !isVisible(f, view)) && opener.isConnected && isVisible(opener, view)) nav.focus(opener);
  };

  // Up or down in the player: show the site's controls (they appear when the
  // pointer moves) and put focus on the nearest one in that direction.
  let ignorePointerUntil = 0;
  let controlsTimer: number | undefined;
  const revealControls = (): void => {
    ignorePointerUntil = Date.now() + 500;
    send({ kind: 'revealControls' });
  };
  // The site hides its controls soon after the pointer stops (under two
  // seconds on the live site; a movement every second holds them). While the
  // user is on one, keep them up, so focus does not vanish mid-thought; give
  // up after a while without a key so the picture is not covered forever.
  const CONTROLS_LINGER_MS = 20_000;
  let lastControlKeyAt = 0;
  const keepAlive = view.setInterval(() => {
    if (Date.now() - lastControlKeyAt < CONTROLS_LINGER_MS && onPlayerControl()) revealControls();
  }, 1000);
  const moveInPlayer = (dir: Direction): void => {
    lastControlKeyAt = Date.now();
    revealControls();
    if (onPlayerControl()) {
      if (!nav.move(dir)) overlay.feedback(dir);
      return;
    }
    // The controls are created and faded in after the pointer moves; wait for them.
    let tries = 0;
    view.clearInterval(controlsTimer);
    controlsTimer = view.setInterval(() => {
      const done = !inPlayer() || (nav.candidates().length > 0 && nav.moveFrom({ x: view.innerWidth / 2, y: view.innerHeight / 2 }, dir));
      if (done || ++tries >= 15) view.clearInterval(controlsTimer);
    }, 100);
  };

  let refocusTimer: number | undefined;
  let followTimer: number | undefined;
  let coverTimer: number | undefined;
  let lastCloseAt = 0;
  let backStreak = 0;
  let lastFrameBackAt = 0;
  let frameBackStreak = 0;
  const back = (): void => {
    const active = doc.activeElement;
    if (isTextEntry(active)) {
      (active as HTMLElement).blur();
      return;
    }
    if (openToggle) {
      const { label, input } = openToggle;
      openToggle = null;
      if (label.isConnected && input.checked) {
        label.click();
        nav.focus(label);
        return;
      }
    }
    if (openDialog(doc)) {
      // The site closes its own pop-ups on Escape.
      pressKey('close');
      leaveDialog();
      return;
    }
    if (hoverHost) {
      // Close the menu and put focus back on the button that opened it.
      unhover();
      if (hoverTrigger?.isConnected) nav.focus(hoverTrigger);
      return;
    }
    if (inPlayer()) {
      // First Back leaves the controls and returns to the picture.
      if (onPlayerControl()) {
        nav.clear();
        return;
      }
      const close = firstMatch(doc, adapter.selectors.playerClose);
      if (close) {
        (close as HTMLElement).click();
        return;
      }
      // Ask the site's player with its own Escape key. With a menu open the
      // first Escape closes the menu and the next one the player, so history
      // is only the last resort: the third Back in a row that leaves the
      // player still open. Nothing is done on a timer; a closing player can
      // linger for a moment, and going back then would lose the title page.
      backStreak = Date.now() - lastCloseAt < 4000 ? backStreak + 1 : 1;
      lastCloseAt = Date.now();
      if (backStreak >= 3) {
        backStreak = 0;
        if (view.history.length > 1) view.history.back();
        return;
      }
      pressPlayerKey('close');
      return;
    }
    if (framed) {
      // A frame never goes back in history: that would leave the page it is
      // part of. First ask the site with its own Escape key (seen on the live
      // site: it closes the sign-in pop-up). If the user is still here and
      // presses Back again, hand the keys to the page around the frame, which
      // does its own Back. So nobody is ever stuck in a frame.
      frameBackStreak = Date.now() - lastFrameBackAt < 4000 ? frameBackStreak + 1 : 1;
      lastFrameBackAt = Date.now();
      if (frameBackStreak >= 2) {
        frameBackStreak = 0;
        send({ kind: 'leaveFrame' });
        return;
      }
      pressKey('close');
      return;
    }
    if (view.history.length > 1) view.history.back();
  };

  // Some sites keep the search field hidden until a control is activated.
  // The control is clicked like any other; the field is focused once it shows.
  const visibleMatch = (selectors: readonly string[]): Element | null => {
    for (const sel of selectors) {
      try {
        for (const el of doc.querySelectorAll(sel)) if (isVisible(el, view)) return el;
      } catch {
        // A bad selector must never break navigation.
      }
    }
    return null;
  };
  let searchPoll: number | undefined;
  const openSearch = (): void => {
    const inputs = [...adapter.selectors.searchInput, ...GENERIC_SEARCH];
    const input = visibleMatch(inputs);
    if (input) {
      nav.focus(input);
      return;
    }
    const opener = visibleMatch(adapter.selectors.searchOpen);
    if (!opener) return;
    (opener as HTMLElement).click();
    let tries = 0;
    view.clearInterval(searchPoll);
    searchPoll = view.setInterval(() => {
      const shown = visibleMatch(inputs);
      if (shown) nav.focus(shown);
      if (shown || ++tries >= 15) view.clearInterval(searchPoll);
    }, 100);
  };

  const dispatch = (a: Action): void => {
    if (collapsed()) {
      if (a.type === 'exit') send({ kind: 'exit' });
      else if (a.type === 'back') send({ kind: 'leaveFrame' });
      else send({ kind: 'frameEdge', dir: a.type === 'move' ? a.dir : 'down' });
      return;
    }
    doc.documentElement.classList.add('sapling-no-pointer');
    restoreAfterDialog();
    // A pending "pick focus up again" belongs to the previous key; a new key
    // overrides it (Back right after Enter must not have focus put back).
    view.clearTimeout(refocusTimer);
    view.clearTimeout(followTimer);
    view.clearInterval(coverTimer);
    if (aboutOpen) {
      // The panel only needs closing; every other key waits until it is gone.
      if (a.type === 'back' || a.type === 'select' || a.type === 'settings') {
        aboutOpen = false;
        overlay.about(null);
      }
      if (a.type !== 'exit') return;
    }
    if (oskOpen) {
      if (a.type === 'move') {
        // Up from the top row leaves the keyboard for the page.
        if (!osk.move(a.dir) && a.dir === 'up') {
          closeOsk();
          (doc.activeElement as HTMLElement | null)?.blur();
          nav.move('up');
        }
        drawOsk();
        return;
      }
      if (a.type === 'select') {
        pressOsk();
        return;
      }
      if (a.type === 'back') {
        closeOsk();
        return;
      }
      closeOsk();
    }
    switch (a.type) {
      case 'move':
        if (inPlayer()) moveInPlayer(a.dir);
        else moveInPage(a.dir);
        break;
      case 'select': {
        lastControlKeyAt = Date.now();
        const target = nav.focused;
        const box = target?.getBoundingClientRect();
        if (target && !inPlayer() && opensMenuFirst(target)) {
          hoverOn(target);
          break;
        }
        if (target && isFrameEl(target)) {
          // Hand the keys to the frame; the layer inside it takes over.
          (target as HTMLElement).focus();
          break;
        }
        if (!nav.activate()) {
          nav.move('down');
          break;
        }
        overlay.feedback('press');
        // A label that opens a list by ticking a hidden checkbox: remember it, so Back can close the list.
        if (target instanceof HTMLLabelElement && target.control instanceof HTMLInputElement && target.control.type === 'checkbox') {
          openToggle = target.control.checked ? { label: target, input: target.control } : null;
        }
        if (target && !inPlayer()) {
          hoverIfStillCollapsed(target);
          // Some controls scroll the page to another section (tabs that are
          // really jump links). Focus follows to what is now on screen.
          // What was selected may open something over the whole screen (the
          // player, while its video is still loading). The ring goes as soon
          // as that is in front, not when the video finally starts.
          let looks = 0;
          view.clearInterval(coverTimer);
          coverTimer = view.setInterval(() => {
            if (++looks > 60 || nav.focused !== target || openDialog(doc)) view.clearInterval(coverTimer);
            else if (coveredByScreen(target, view)) {
              view.clearInterval(coverTimer);
              nav.clear();
            }
          }, 150);
          view.clearTimeout(followTimer);
          followTimer = view.setTimeout(() => {
            if (enterDialog()) return;
            if (!inPlayer() && nav.focused === target && nav.focusIsOffScreen()) nav.focusFirstOnScreen();
          }, 900);
        }
        // Activating a player control can replace it (a menu opens, a list
        // changes). Pick focus up again next to where it was.
        if (box && inPlayer()) {
          view.clearTimeout(refocusTimer);
          refocusTimer = view.setTimeout(() => {
            if (inPlayer() && !onPlayerControl()) nav.focusNearest({ x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 });
          }, 500);
        }
        break;
      }
      case 'back':
        back();
        break;
      case 'playPause':
      case 'seek': {
        const key = playerKeyFor(a);
        if (key) pressPlayerKey(key);
        break;
      }
      case 'search':
        openSearch();
        break;
      case 'diagnostics':
        send({ kind: 'diagnostics', outline: buildOutline(doc.documentElement), url: sanitizeUrl(view.location.href) });
        overlay.toast('Page outline saved (structure only, no text)');
        break;
      case 'settings':
        closeOsk();
        aboutOpen = true;
        overlay.about({ title: aboutTitle(options.version), notice: NOTICE, help: HELP });
        break;
      case 'exit':
        send({ kind: 'exit' });
        break;
    }
  };

  const onKey = (e: KeyboardEvent): void => {
    if (!e.isTrusted && !options.automation) return;
    // A key the layer asked the shell to press: it belongs to the site.
    if (e.isTrusted && injected.consume(e.key, Date.now())) return;
    // A real keyboard is in use: typing a character puts the on-screen one away.
    // Not Space: on some remotes that is the OK button, and it must press the highlighted key.
    if (oskOpen && e.isTrusted && e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      closeOsk();
      return;
    }
    const action = keyToAction(e, mode(), options.keys);
    if (!action) return;
    // In the player, a key that is already the site's own key for the action
    // goes straight to the site, untouched.
    if (isNativePlayerKey(e.key, action) && inPlayer()) return;
    e.preventDefault();
    // Immediate: the site may also listen on the window, and must not see a
    // key the layer has taken.
    e.stopImmediatePropagation();
    taken.add(e.key);
    dispatch(action);
  };
  view.addEventListener('keydown', onKey, true);
  // A key the layer took on the way down is taken on the way up too. Seen on
  // the live site: its sign-in form closes on the release of Escape, so Back
  // meant only for the on-screen keyboard closed the whole form.
  const taken = new Set<string>();
  const onKeyUp = (e: KeyboardEvent): void => {
    if (!taken.delete(e.key)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  view.addEventListener('keyup', onKeyUp, true);

  // A text field the page focused by itself (a sign-in page puts the cursor
  // in its first field): take it as the remote's focus too, so the ring is on
  // it and the on-screen keyboard is up without a key press.
  const adoptField = (el: Element | null): void => {
    if (!el || !isTextEntry(el) || el.closest(HOST_TAG) || collapsed()) return;
    if (nav.focused !== el) nav.focus(el);
    // Already the remote's focus from before (the field was left and the page came back to it).
    else if (!oskOpen && !keyboardBarred(el)) openOsk(el);
  };
  const onFocusIn = (e: FocusEvent): void => adoptField(e.target instanceof Element ? e.target : null);
  doc.addEventListener('focusin', onFocusIn, true);
  adoptField(doc.activeElement);

  const onPointer = (): void => {
    // The shell's own nudge (see revealControls) is not the user reaching for a mouse.
    if (Date.now() < ignorePointerUntil) return;
    doc.documentElement.classList.remove('sapling-no-pointer');
  };
  view.addEventListener('mousemove', onPointer, { passive: true });

  // A game controller is read by the page only (a frame from another site may
  // not see it at all). While the keys are with a frame, its presses are sent
  // on to the layer in that frame through the shell.
  const stopPads = framed
    ? (): void => undefined
    : startPolling(view, mode, (a) => (keysInFrame() ? send({ kind: 'relay', action: a }) : dispatch(a)), options.buttons);

  // In a frame: when the keys arrive, put focus somewhere useful (a text
  // field first: a frame is usually a form); when they leave, drop the ring.
  const focusSomethingUseful = (): void => {
    const f = nav.focused;
    if (f && !isFrameEl(f) && isVisible(f, view)) {
      nav.focus(f);
      return;
    }
    const field = nav.candidates().find((el) => isTextEntry(el));
    if (!(field && nav.focus(field))) nav.focusFirstOnScreen();
  };
  const arriveInFrame = (): void => {
    view.setTimeout(() => {
      if (!doc.hasFocus() || keysInFrame() || collapsed()) return;
      focusSomethingUseful();
    }, 0);
  };
  const departFrame = (): void => {
    closeOsk();
    overlay.track(null);
  };
  if (framed) {
    view.addEventListener('focus', arriveInFrame);
    view.addEventListener('blur', departFrame);
    if (doc.hasFocus()) arriveInFrame();
  }

  // Tell the shell when video is playing so it can hold off the screensaver.
  let lastPlaying = false;
  let lastAwayAt = 0;
  const playbackTimer = view.setInterval(() => {
    const v = findMainVideo(doc, playerRoots);
    const playing = !!v && !v.paused && !v.ended;
    // Mark the player so the stylesheet can hide controls the site has disabled.
    if (v && inPlayer()) playerScope(v, playerRoots).setAttribute('data-sapling-player', '');
    // Focus left over from the page behind must not carry into the player, and
    // the ring must not sit on the picture unless the user is on a control.
    // (onPlayerControl drops focus that is outside the player. Focus on a
    // control is kept: pausing and resuming from the control bar must not lose it.)
    if (playing && !onPlayerControl()) overlay.track(null);
    // A pop-up that opened on its own takes focus too.
    if (!playing) enterDialog();
    restoreAfterDialog();
    if (playing !== lastPlaying) {
      lastPlaying = playing;
      send({ kind: 'playback', playing });
    }
  }, 2000);

  const stopGuard = options.automation
    ? installPurchaseGuard(doc, adapter.selectors.purchaseControls, () =>
        overlay.toast('Blocked: automation mode never activates purchase or sign-up controls'),
      )
    : (): void => undefined;

  const stopSpike = options.spike ? installSpikeProbes(doc, send) : (): void => undefined;

  return {
    dispatch,
    notice: (text) => overlay.toast(text, 6000),
    away: () => {
      // The window is no longer in front. Pause through the site's own key,
      // and only if something is playing: the key is a toggle.
      // The shell may say it more than once for one departure (focus lost,
      // then minimised); a second key would start playback again.
      if (Date.now() - lastAwayAt < 3000) return;
      const v = findMainVideo(doc, playerRoots);
      if (v && inPlayer() && !v.paused && !v.ended) {
        lastAwayAt = Date.now();
        pressKey('playPause');
      }
    },
    frameEdge: (raw) => {
      if (!isDirection(raw)) return;
      const host = doc.activeElement;
      if (!host || !isFrameEl(host)) return;
      // A frame that shows nothing had the keys: take them back to where
      // the user was, or to the first useful control. No move is made.
      if (!isFrameTarget(host)) {
        focusSomethingUseful();
        return;
      }
      // Carry on from the frame as if it were the focused control. A move
      // focuses something in this document, which takes the keys back.
      if (nav.focused !== host) nav.focus(host);
      if (!nav.move(raw) && framed) send({ kind: 'frameEdge', dir: raw });
    },
    leaveFrame: () => {
      if (!keysInFrame()) return;
      view.focus();
      (doc.activeElement as HTMLElement | null)?.blur();
      back();
    },
    stop: () => {
      view.removeEventListener('focus', arriveInFrame);
      view.removeEventListener('blur', departFrame);
      view.removeEventListener('keydown', onKey, true);
      view.removeEventListener('keyup', onKeyUp, true);
      doc.removeEventListener('focusin', onFocusIn, true);
      view.removeEventListener('mousemove', onPointer);
      view.clearInterval(playbackTimer);
      view.clearInterval(searchPoll);
      view.clearInterval(controlsTimer);
      view.clearInterval(keepAlive);
      view.clearTimeout(refocusTimer);
      view.clearInterval(coverTimer);
      view.clearTimeout(dialogTimer);
      view.clearTimeout(hoverTimer);
      view.clearTimeout(edgeTimer);
      stopPads();
      stopGuard();
      stopSpike();
    },
  };
}
