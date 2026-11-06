import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { execFile } from 'child_process'
import * as db from './db'

const isDev = !!process.env.ELECTRON_RENDERER_URL

let mainWindow: BrowserWindow | null = null
let widgetWindow: BrowserWindow | null = null

const preload = join(__dirname, '../preload/index.js')

const WIDGET_RIGHT_MARGIN = 24
const WIDGET_TOP_MARGIN = 24
const WIDGET_MIN_WIDTH = 260
const WIDGET_MIN_HEIGHT = 200
let widgetResizeSaveTimer: NodeJS.Timeout | null = null
// True while the widget sits on the desktop behind other windows (sent to back).
let widgetSentToBack = false

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function getWidgetWindow(): BrowserWindow | null {
  return widgetWindow
}

export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    return mainWindow
  }

  mainWindow = new BrowserWindow({
    width: 980,
    height: 680,
    minWidth: 760,
    minHeight: 520,
    title: 'TimeTracker',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload,
      sandbox: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  mainWindow.on('close', (e) => {
    // Hide instead of quit so the app keeps tracking in the tray.
    if (!(global as any).__appQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

/** Opens (or focuses) the main window and switches it straight to the calendar tab. */
export function openCalendarWindow(): void {
  const win = createMainWindow()
  const navigate = (): void => win.webContents.send('navigate:tab', 'calendar')
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', navigate)
  } else {
    navigate()
  }
}

export function createWidgetWindow(): BrowserWindow {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    return widgetWindow
  }

  const settings = db.getSettingsSync()
  const savedWidth = settings?.widgetWidth ?? 300
  const savedHeight = settings?.widgetHeight ?? 400

  const display = screen.getPrimaryDisplay()
  const workArea = display.workArea
  // Keep a previously saved size inside the screen so the widget never starts off-screen.
  const width = Math.min(savedWidth, workArea.width - WIDGET_RIGHT_MARGIN * 2)
  const height = Math.min(savedHeight, workArea.height - WIDGET_TOP_MARGIN * 2)

  widgetWindow = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width - WIDGET_RIGHT_MARGIN,
    y: workArea.y + WIDGET_TOP_MARGIN,
    minWidth: WIDGET_MIN_WIDTH,
    minHeight: WIDGET_MIN_HEIGHT,
    resizable: true,
    movable: true,
    maximizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload,
      sandbox: false
    }
  })

  widgetWindow.setAlwaysOnTop(true, 'screen-saver')

  widgetWindow.on('resize', () => {
    if (widgetResizeSaveTimer) clearTimeout(widgetResizeSaveTimer)
    widgetResizeSaveTimer = setTimeout(() => {
      if (!widgetWindow || widgetWindow.isDestroyed()) return
      const bounds = widgetWindow.getBounds()
      db.updateSettings({ widgetWidth: bounds.width, widgetHeight: bounds.height }).catch(() => {})
    }, 400)
  })

  // Minimizing sends the widget to the desktop (behind other windows) instead of shrinking it.
  widgetWindow.on('minimize', () => {
    widgetWindow?.restore()
    sendWidgetToBack()
  })

  widgetWindow.on('close', (e) => {
    if (!(global as any).__appQuitting) {
      e.preventDefault()
      widgetWindow?.hide()
    }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    widgetWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/widget.html`)
  } else {
    widgetWindow.loadFile(join(__dirname, '../renderer/widget.html'))
  }

  return widgetWindow
}

/** Shows the widget, re-enabling always-on-top and bringing it above other windows. */
export function showWidgetWindow(): void {
  const w = createWidgetWindow()
  widgetSentToBack = false
  w.setAlwaysOnTop(true, 'screen-saver')
  w.showInactive()
  w.moveTop()
}

export function hideWidgetWindow(): void {
  widgetWindow?.hide()
}

export function toggleWidgetWindow(): void {
  const w = createWidgetWindow()
  // A widget sitting behind other windows is brought back to the front rather than hidden.
  if (w.isVisible() && !widgetSentToBack) {
    hideWidgetWindow()
  } else {
    showWidgetWindow()
  }
}

function getHwndPointer(win: BrowserWindow): bigint {
  const buf = win.getNativeWindowHandle()
  return buf.readBigUInt64LE(0)
}

/**
 * Emulates Win32 "send to back" (HWND_BOTTOM) via PowerShell/P-Invoke, since
 * Electron has no z-order API below "always on top". The window stays fully
 * visible on the desktop, just behind other normal windows.
 */
export function sendWidgetToBack(): void {
  if (!widgetWindow || widgetWindow.isDestroyed()) return
  widgetSentToBack = true
  widgetWindow.setAlwaysOnTop(false)
  widgetWindow.blur()

  const hwnd = getHwndPointer(widgetWindow).toString()
  const script = [
    'Add-Type @"',
    'using System;',
    'using System.Runtime.InteropServices;',
    'public class TimeTrackerWin32 {',
    '  [DllImport("user32.dll")]',
    '  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);',
    '}',
    '"@',
    `[TimeTrackerWin32]::SetWindowPos([IntPtr]${hwnd}, [IntPtr]1, 0, 0, 0, 0, 0x0013) | Out-Null`
  ].join('\n')

  execFile(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script],
    () => {
      // Best-effort; ignore failures (e.g. PowerShell unavailable).
    }
  )
}
