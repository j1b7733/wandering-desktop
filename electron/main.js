/* global process */
const { app, BrowserWindow, Menu, MenuItem, ipcMain, dialog } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');

const isDev = !app.isPackaged;

function buildAppMenu(mainWindow) {
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Back Up Now…',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => mainWindow.webContents.send('menu:backup'),
        },
        {
          label: 'Restore from Backup…',
          click: () => mainWindow.webContents.send('menu:restore'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow.webContents.toggleDevTools(),
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Wandering Help & Guide',
          click: () => mainWindow.webContents.send('menu:help'),
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerIpcHandlers() {
  // Native save dialog
  ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return dialog.showSaveDialog(win, options);
  });

  // Native open dialog
  ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return dialog.showOpenDialog(win, options);
  });

  // Renderer signals it has finished the on-exit backup
  ipcMain.once('app:quit-ready', () => {
    app.quit();
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false  // Required for file:// protocol to load local assets
    }
  });

  buildAppMenu(mainWindow);

  // Spell-check right-click context menu
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();

    // Add spell-check suggestions if a misspelled word was right-clicked
    if (params.misspelledWord) {
      if (params.dictionarySuggestions.length > 0) {
        params.dictionarySuggestions.forEach((suggestion) => {
          menu.append(new MenuItem({
            label: suggestion,
            click: () => mainWindow.webContents.replaceMisspelling(suggestion),
          }));
        });
      } else {
        menu.append(new MenuItem({ label: 'No suggestions', enabled: false }));
      }

      menu.append(new MenuItem({
        label: `Add "${params.misspelledWord}" to dictionary`,
        click: () => mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
      }));

      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Standard edit actions (only show when in an editable field)
    if (params.isEditable) {
      menu.append(new MenuItem({ label: 'Cut',       role: 'cut' }));
      menu.append(new MenuItem({ label: 'Copy',      role: 'copy' }));
      menu.append(new MenuItem({ label: 'Paste',     role: 'paste' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
    } else if (params.selectionText) {
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
    }

    if (menu.items.length > 0) {
      menu.popup({ window: mainWindow });
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  // Intercept quit: ask renderer to run auto-backup first, then quit for real
  let quitting = false;
  app.on('before-quit', (event) => {
    if (quitting) return; // second pass — let it through
    event.preventDefault();
    quitting = true;
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('app:before-quit');
      // Safety timeout: if renderer doesn't respond in 15s, force quit
      setTimeout(() => app.quit(), 15000);
    } else {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
