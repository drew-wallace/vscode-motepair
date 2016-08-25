var vscode = require('vscode');
var EventHandler = require('./event_handler');
var AtomShare = require('./atom_share');
var WebSocket = require('ws'); //ws
var NewSessionView = require('./new-session-view');
var SessionView = require('./session-view');
var RemoteCursorView = require('./remote-cursor-view');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var context, atom_share, view, ws, event_handler, sessionStatusView, heartbeatId;
var address = atom.config.get('motepair.serverAddress')
var portNumber = atom.config.get('motepair.serverPort')
var secureConnection = atom.config.get('motepair.secureConnection')

function setDefaultValues() {
	address = atom.config.get('motepair.serverAddress')
	portNumber = atom.config.get('motepair.serverPort')
	secureConnection = atom.config.get('motepair.secureConnection')
}

function createSocketConnection() {
	setDefaultValues()
	proto = secureConnection ? 'wss' : 'ws'
	return new WebSocket(proto + "://" + address + ":" + portNumber);
}

function activate(c) {
	context = c;
	setDefaultValues()
	var motepairConnect = vscode.commands.registerCommand('extension.motepair.connect', startSession);
	var motepairDisconnect = vscode.commands.registerCommand('extension.motepair.disconnect', startSession);
	context.subscriptions.push(motepairConnect);
	context.subscriptions.push(motepairDisconnect);
}

function startSession() {
	view = new NewSessionView();
	view.show();

	var motepairCoreConfirm = vscode.commands.registerCommand('extension.motepair.core.confirm', function () {
		if (view.miniEditor.getText() != '') {
			connect(view.miniEditor.getText());
		} else {
			vscode.window.showWarningMessage("Motepair: Session ID can not be empty.");
		}
	});
	context.subscriptions.push(motepairCoreConfirm);
}

function setupHeartbeat() {
	heartbeatId = setInterval(function () {
		try {
			ws.send('ping', function (error) {
				if (error) {
					event_handler.emitter.emit('socket-not-opened');
					clearInterval(heartbeatId)
				}
			});
		} catch (error) {
			event_handler.emitter.emit('socket-not-opened')
			clearInterval(heartbeatId)
		}
	}, 30000);
}

function connect(sessionId) {

    ws = ws || createSocketConnection();

    ws.on("open", function () {
		vscode.window.showInformationMessage("Motepair: Session started.");
		setupHeartbeat();
		atom_share = new AtomShare(ws)
		atom_share.start(sessionId)

		event_handler = new EventHandler(ws);
		event_handler.listen();

		event_handler.emitter.on('socket-not-opened', function () {
			vscode.window.showWarningMessage("Motepair: Connection get lost.");
			deactivate();
		});

		sessionStatusView = new SessionView;
		sessionStatusView.show(view.miniEditor.getText());
		//atom.clipboard.write(view.miniEditor.getText());  //==========================node module: node-copy-paste
	});

    ws.on('error', function (e) {
		console.log('error', e)
		vscode.window.showWarningMessage("Motepair: Could not connect to server.");
		ws.close();
		ws = null;
	});
}

function deactivate() {
	clearInterval(heartbeatId)
	if (ws) {
		vscode.window.showInformationMessage("Motepair: Disconnected from session.");
		sessionStatusView.hide();
		ws.close();
		ws = null;
		event_handler.subscriptions.dispose();
		atom_share.subscriptions.dispose();
	} else {
		vscode.window.showErrorMessage("Motepair: No active session found.");
	}
}

module.exports = {
	version: require('../package.json').version,
	// The default remote pair settings
	// Internal: The default configuration properties for the package.
	config: {
		serverAddress: {
			title: 'Server address',
			type: 'string',
			default: 'wss.motepair.com'
		},
		serverPort: {
			title: 'Server port number',
			type: 'integer',
			default: 80
		},
		secureConnection: {
			title: 'Secure Connection',
			type: 'boolean',
			default: false
		},
		userEmail: {
			title: 'Email address',
			type: 'string',
			default: ''
		},
		syncTabs: {
			title: 'Sync Tabs',
			type: 'boolean',
			default: true
		}
	},
	setDefaultValues: setDefaultValues,
	createSocketConnection: createSocketConnection,
	activate: activate,
	startSession: startSession,
	setupHeartbeat: setupHeartbeat,
    connect: connect,
	deactivate: deactivate
};