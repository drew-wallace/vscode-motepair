var Events = require('events').EventEmitter;
var atom = require('atom');
var CompositeDisposable = atom.CompositeDisposable;
var Range = atom.Range;
var Point = atom.Point;
var TextEditor = atom.TextEditor;
var RemoteCursorView = require('./remote-cursor-view');
var fs = require('fs');

var emitter, project, projectPath, workspace, subscriptions, localChange, userEmail, lastCursorChange, remoteAction, syncTabsEvents, path;

function constructor(remoteClient) {
    emitter = new EventEmitter;
    project = atom.project;
    projectPath = project.getPaths()[0];
    workspace = atom.workspace;
    subscriptions = new CompositeDisposable;
    localChange = false;
    userEmail = atom.config.get('motepair.userEmail');
    lastCursorChange = new Date().getTime();
    remoteAction = false;

    syncTabsEvents = ['open', 'close'];
}
function onopen(data) {
    path = projectPath + "/" + data.file;
    remoteAction = true;
    workspace.open(path);
    setTimeout(function () {
        remoteAction = false
    }, 300)
}
function onclose(data) {
    closedItem = null

    workspace.getPaneItems().forEach(function (item) {
        closedItem = (item.getPath && item.getPath() && item.getPath().indexOf(data.file) >= 0 ? item : null);
    });

    remoteAction = true;
    workspace.getActivePane().destroyItem(closedItem);
    setTimeout(function () {
        remoteAction = false;
    }, 300);
}
function onsave(data) {
    workspace.getPaneItems().forEach(function (item) {
        item.getPath && item.getPath() && item.getPath().indexOf(data.file) >= 0 ? item.save() : void (0);
    });
}
function onselect(data) {
    var editor = atom.workspace.getActivePaneItem();
    if (editor && editor.getPath && data.file == project.relativize(editor.getPath())) {
        if (editor.selectionMarker) editor.selectionMarker.destroy();
        if (Point.fromObject(data.select.start).isEqual(Point.fromObject(data.select.end))) {
            void (0);
        } else {
            if (editor.markBufferRange) {
                editor.selectionMarker = editor.markBufferRange(Range.fromObject(data.select), { invalidate: 'never' });
                editor.decorateMarker(editor.selectionMarker, { type: 'highlight', class: 'mp-selection' });
            } else {
                return;
            }
        }
    } else {
        return;
    }
}
function oncursor(data) {
    var editor = atom.workspace.getActivePaneItem();
    if (editor && editor.getPath && editor.markBufferPosition && data.file == project.relativize(editor.getPath())) {
        if (editor.remoteCursor) editor.remoteCursor.marker.destroy();
        editor.remoteCursor = new RemoteCursorView(editor, data.cursor, data.userEmail);
        setGravatarDuration(editor);
        editor.scrollToBufferPosition(data.cursor, { center: true });
    } else {
        return;
    }
}
function setGravatarDuration(editor) {
    var gravatarDelay = 1500;
    var now = new Date().getTime();

    if (now - lastCursorChange < gravatarDelay) {
        clearInterval(gravatarTimeoutId);
        gravatarTimeoutId = setTimeout(function () {
            if (editor.remoteCursor) editor.remoteCursor.gravatar.hide(300);
        }, gravatarDelay);
    }

    lastCursorChange = now;
}
function sendFileEvents(type, file) {
    var data = { a: 'meta', type: type, data: { file: project.relativize(file) } };

    if (remoteAction) {
        void (0);
    } else {
        sendMessage(data);
    }
}
function sendMessage(data) {
    try {
        remoteClient.send(JSON.stringify(data));
    } catch (e) {
        emitter.emit('socket-not-opened');
    }
}
function listen() {
    remoteClient.on('message', function (event) {
        event = JSON.parse(event)

        if (EventHandler["on" + event.type]) {
            if (atom.config.get('motepair.syncTabs') || syncTabsEvents.indexOf(event.type) == -1) {
                EventHandler["on" + event.type](event.data);
            }
        }
    });

    subscriptions.add(workspace.observeTextEditors(function (editor) {
        subscriptions.add(editor.onDidChangeCursorPosition(function (event) {
            if (editor.suppress) return;

            var data = {
                a: 'meta',
                type: 'cursor',
                data: {
                    file: project.relativize(editor.getPath()),
                    cursor: event.newBufferPosition,
                    userEmail: userEmail
                }
            }

            setTimeout(function () { // cursor and selection data should be sent after op data
                sendMessage(data);
            }, 0);
        }));

        subscriptions.add(editor.onDidChangeSelectionRange(function (event) {
            var data = {
                a: 'meta',
                type: 'select',
                data: {
                    file: project.relativize(editor.getPath()),
                    select: event.newBufferRange
                }
            }

            setTimeout(function () {
                sendMessage(data);
            }, 0);
        }));

        subscriptions.add(editor.onDidSave(function (event) {
            sendFileEvents('save', event.path);
        }));
    }));

    subscriptions.add(workspace.onWillDestroyPaneItem(function (event) {
        if (event.item.getPath && event.item.getPath()) {
            if (event.item.detachShareJsDoc) event.item.detachShareJsDoc();
            sendFileEvents('close', event.item.getPath());
        } else {
            return;
        }

    }));

    subscriptions.add(workspace.onDidChangeActivePaneItem(function (event) {
        if (event && event.getPath && event.getPath() && event.getPath().match(new RegExp(projectPath))) {
            sendFileEvents('open', event.getPath())
        } else {
            return;
        }
    }));
}

module.exports = EventHandler = {
    init: init,
    onopen: onopen,
    onclose: onclose,
    onsave: onsave,
    onselect: onselect,
    oncursor: oncursor,
    setGravatarDuration: setGravatarDuration,
    sendFileEvents: sendFileEvents,
    sendMessage: sendMessage,
    listen: listen
};
