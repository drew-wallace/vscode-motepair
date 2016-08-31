(function () {
  'use strict';

  /**
   * @param cm - CodeMirror instance
   * @param doc - Share context
   */
  function shareVSCodeEditor(TextEditor, doc) {
    var vscode = require('vscode');
    if (!doc.provides.text) throw new Error('Cannot attach to non-text document');

    var otText = doc.data //probably should fetch hear
    var allTextRange = new vscode.Range(new vscode.Position(0, 0), TextEditor.document.lineAt(TextEditor.document.lineCount - 1).range.end);
    var editorText = TextEditor.document.getText(allTextRange);
    if (otText.length === 0){
      doc.submitOp([editorText]);
    } else if (otText !== editorText) {
      TextEditor.edit(function(textEditorEdit){
          return textEditorEdit.replace(allTextRange, otText);
      }).then(function(didReplace){
          console.log("didReplace", didReplace);
      });
    }

    check();

    // *** remote -> local changes

    doc.on('op', function (op) {
      // Not sure if the view column function is going to know if the editor was destroyed
      if (!TextEditor.viewColumn()) return; // returns when TextEditor is destroyed.

      if(typeof op[1] === "object") {
        TextEditor.edit(function(textEditorEdit){
          return textEditorEdit.insert(TextEditor.document.positionAt(op[0]), text);
        }).then(function(didEdit){
          console.log("didEdit", didEdit);
          // I don't think I would want this feature by default.
          // Maybe as a dedicated command, or it could be setting defined
          // TextEditor.revealRange(TextEditor.document.positionAt(op[0]), vscode.TextEditorRevealType.InCenter);
          check();
        });
      } else {
        var range = new vscode.Range(TextEditor.document.positionAt(op[0]), TextEditor.document.positionAt(op[0] + op[1].d));
        TextEditor.edit(function(textEditorEdit){
          return textEditorEdit.delete(range);
        }).then(function(didDelete){
          console.log("didDelete", didDelete);
          // I don't think I would want this feature by default.
          // Maybe as a dedicated command, or it could be setting defined
          // TextEditor.revealRange(TextEditor.document.positionAt(op[0]), vscode.TextEditorRevealType.InCenter);
          check();
        });
      }
    });

    // *** local -> remote changes

    // cm.on('change', onLocalChange);
    var disposable = vscode.workspace.onDidChangeTextDocument(onLocalChange);

    function onLocalChange(TextDocumentChangeEvent) {
      applyToShareJS(TextEditor, TextDocumentChangeEvent);
      check();
    }

    TextEditor.document.detachShareJsDoc = function () {
      doc.onRemove = null;
      doc.onInsert = null;
      disposable.dispose();
    }

    // Convert a CodeMirror change into an op understood by share.js
    function applyToShareJS(TextEditor, TextDocumentChangeEvent) {
      var startPos = 0

      if(TextDocumentChangeEvent.text.length === 0){
        var position = new vscode.Position(TextDocumentChangeEvent.range.start.line, TextDocumentChangeEvent.range.start.character);
        doc.remove(TextDocumentChangeEvent.range, TextDocumentChangeEvent.oldText.length);
      }

      if (TextDocumentChangeEvent.text.length > 0) {
        var position = new vscode.Position(TextDocumentChangeEvent.range.start.line, TextDocumentChangeEvent.range.start.character);
        doc.submitOp([TextEditor.document.offsetAt(position), {d: TextDocumentChangeEvent.rangeLength}]);
      }

    }

    function check() {
      setTimeout(function () {
        var allTextRange = new vscode.Range(new vscode.Position(0, 0), TextEditor.document.lineAt(TextEditor.document.lineCount - 1).range.end);
        var editorText = TextEditor.document.getText(allTextRange);
        var otText = doc.data; // probably need to use fetch here

        if (editorText != otText) {
          console.error("Text does not match!");
          console.error("editor: " + editorText);
          console.error("ot: " + otText);
          // Replace the editor text with the doc snapshot.
          TextEditor.edit(function(textEditorEdit){
            return textEditorEdit.replace(allTextRange, otText);
          }).then(function(didReplace){
            console.log("didReplace", didReplace);
          });
        }
      }, 0);
    }

    return doc;
  }

    module.exports = shareVSCodeEditor;
})();
