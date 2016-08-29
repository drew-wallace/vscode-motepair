// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
// var main = require('./lib/main');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "motepair-vscode" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    // var icon = vscode.window.createTextEditorDecorationType({
    //     gutterIconPath: 'http://image.flaticon.com/icons/svg/188/188918.svg'
    // });
    var remoteHighlight = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(31, 161, 93, 0.3)'
    });
    var remoteCursor = vscode.window.createTextEditorDecorationType({
        overviewRulerLane: '7',
        overviewRulerColor: 'rgb(31, 161, 93)',
        borderStyle: "solid",
        borderColor: "rgb(31, 161, 93)",
        borderWidth: "0 0 0 2px",
        before: {
            backgroundColor: 'transparent',
            contentIconPath: '/Users/drewwallace/Downloads/pokeball.svg',
            height: '18px',
            width: '18px'
        }
    });
    var remoteCursorEnd = vscode.window.createTextEditorDecorationType({
        overviewRulerLane: '7',
        overviewRulerColor: 'rgb(31, 161, 93)',
        borderStyle: "solid",
        borderColor: "rgb(31, 161, 93)",
        borderWidth: "0 2px 0 0",
        after: {
            backgroundColor: 'transparent',
            contentIconPath: '/Users/drewwallace/Downloads/pokeball.svg',
            height: '18px',
            width: '18px'
        }
    });

    var highlight = vscode.commands.registerCommand('extension.highlight', function () {
        var range = new vscode.Range(vscode.window.activeTextEditor.selection.start, vscode.window.activeTextEditor.selection.end);
        var position = new vscode.Range(vscode.window.activeTextEditor.selection.active, vscode.window.activeTextEditor.selection.active);
        if(position.end.character === vscode.window.activeTextEditor.document.lineAt(position.start.line).range.end.character) {
            vscode.window.activeTextEditor.setDecorations(remoteCursorEnd, [position]);
            vscode.window.activeTextEditor.setDecorations(remoteCursor, []);
        } else {
            vscode.window.activeTextEditor.setDecorations(remoteCursor, [position]);
            vscode.window.activeTextEditor.setDecorations(remoteCursorEnd, []);
        }
        vscode.window.activeTextEditor.setDecorations(remoteHighlight, [range]);

        // vscode.window.activeTextEditor.revealRange(position, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    });
    var refresh = vscode.commands.registerCommand('extension.refresh', function () {
        vscode.window.activeTextEditor.setDecorations(remoteHighlight, []);
        vscode.window.activeTextEditor.setDecorations(remoteCursor, []);
        vscode.window.activeTextEditor.setDecorations(remoteCursorEnd, []);
    });
    var edit = vscode.commands.registerCommand('extension.edit', function () {
        vscode.window.activeTextEditor.setDecorations(remoteHighlight, []);
        vscode.window.activeTextEditor.setDecorations(remoteCursor, []);
        vscode.window.activeTextEditor.setDecorations(remoteCursorEnd, []);
        var position = new vscode.Position(vscode.window.activeTextEditor.selection.active.line + 1, vscode.window.activeTextEditor.selection.active.character);
        vscode.window.activeTextEditor.edit(function(textEditorEdit){
            return textEditorEdit.insert(position, 'test');
        }).then(function(didEdit){
            console.log("didEdit", didEdit);
        });
        // position = new vscode.Range(vscode.window.activeTextEditor.selection.active, vscode.window.activeTextEditor.selection.active);
        // if(position.character === vscode.window.activeTextEditor.document.lineAt(position.line).range.end.character) {
        //     vscode.window.activeTextEditor.setDecorations(remoteCursorEnd, [position]);
        //     vscode.window.activeTextEditor.setDecorations(remoteCursor, []);
        // } else {
        //     vscode.window.activeTextEditor.setDecorations(remoteCursor, [position]);
        //     vscode.window.activeTextEditor.setDecorations(remoteCursorEnd, []);
        // }
    });

    // vscode.window.onDidChangeTextEditorSelection(function(TextEditorSelectionChangeEvent){
    //     console.log(TextEditorSelectionChangeEvent);
    // });

    // vscode.workspace.onDidCloseTextDocument(function(TextDocument){
    //     console.log(TextDocument);
    // });

    // FIGURE OUT PATH STUFF --------------------------------------------------->
    vscode.window.onDidChangeActiveTextEditor(function(TextEditor){
        console.log("Change active");
        console.log(TextEditor.document.uri.path);
        console.log(vscode.workspace.asRelativePath(TextEditor.document.uri));
    });
    vscode.workspace.onDidOpenTextDocument(function(TextDocument){
        console.log("Open document");
        console.log(TextDocument.uri.path);
        console.log(vscode.workspace.asRelativePath(TextDocument.uri));
    });

    context.subscriptions.push(highlight);
    context.subscriptions.push(refresh);
    context.subscriptions.push(edit);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;