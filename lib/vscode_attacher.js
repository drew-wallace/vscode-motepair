(function () {
  'use strict';

  /**
   * @param cm - CodeMirror instance
   * @param ctx - Share context
   */
  function shareVSCodeEditor(TextEditor, ctx) {
    if (!ctx.provides.text) throw new Error('Cannot attach to non-text document');

    var otText = ctx.get() //|| ''; // Due to a bug in share - get() returns undefined for empty docs.
    var allTextRange = new vscode.Range(new vscode.Position(0, 0), TextEditor.document.lineAt(TextEditor.document.lineCount - 1).range.end);
    var editorText = TextEditor.getText(allTextRange);
    if (otText.length === 0){
      ctx.insert(0, editorText);
    } else if (otText !== editorText) {
      // TextEditor.setText(otText);
      TextEditor.edit(function(textEditorEdit){
          return textEditorEdit.replace(allTextRange, otText);
      }).then(function(didReplace){
          console.log("didReplace", didReplace);
      });
    }

    check();

    // *** remote -> local changes

    ctx.onInsert = function (index, text) {
      // Not sure if the view column function is going to know if the editor was destroyed
      if (!TextEditor.viewColumn()) return; // returns when TextEditor is destroyed.

      buffer = TextEditor;

      buffer.edit(function(textEditorEdit){
        return textEditorEdit.insert(index, text);
      }).then(function(didEdit){
        console.log("didEdit", didEdit);
        // I don't think I would want this feature by default.
			  // Maybe as a dedicated command, or it could be setting defined
        // TextEditor.revealRange(index, vscode.TextEditorRevealType.InCenter);
        check();
      });
    };

    ctx.onRemove = function (index, length) {
      // Not sure if the view column function is going to know if the editor was destroyed
      if (!TextEditor.viewColumn()) return; // returns when TextEditor is destroyed.

      buffer = TextEditor;

      var range = new vscode.Range(index, length);
      buffer.edit(function(textEditorEdit){
        return textEditorEdit.delete(range);
      }).then(function(didDelete){
        console.log("didDelete", didDelete);
        // I don't think I would want this feature by default.
			  // Maybe as a dedicated command, or it could be setting defined
        // TextEditor.revealRange(index, vscode.TextEditorRevealType.InCenter);
        check();
      });
    };

    // *** local -> remote changes

    // cm.on('change', onLocalChange);
    var buffer = TextEditor;
    var disposable = vscode.workspace.onDidChangeTextDocument(onLocalChange);

    function onLocalChange(TextDocumentChangeEvent) {
      applyToShareJS(TextEditor, TextDocumentChangeEvent);
      check();
    }

    TextEditor.document.detachShareJsDoc = function () {
      ctx.onRemove = null;
      ctx.onInsert = null;
      disposable.dispose();
    }

    // Convert a CodeMirror change into an op understood by share.js
    function applyToShareJS(TextEditor, TextDocumentChangeEvent) {
      var startPos = 0

      if(TextDocumentChangeEvent.text.length === 0){
        ctx.remove(TextDocumentChangeEvent.range, TextDocumentChangeEvent.oldText.length);
      }

      if (TextDocumentChangeEvent.text.length > 0) {
        ctx.insert(TextDocumentChangeEvent.range, TextDocumentChangeEvent.newText);
      }

    }

    function check() {
      setTimeout(function () {
        var allTextRange = new vscode.Range(new vscode.Position(0, 0), TextEditor.document.lineAt(TextEditor.document.lineCount - 1).range.end);
        var editorText = TextEditor.getText(allTextRange);
        var otText = ctx.get() || '';

        if (editorText != otText) {
          console.error("Text does not match!");
          console.error("editor: " + editorText);
          console.error("ot: " + otText);
          // Replace the editor text with the ctx snapshot.
          TextEditor.edit(function(textEditorEdit){
            return textEditorEdit.replace(allTextRange, otText);
          }).then(function(didReplace){
            console.log("didReplace", didReplace);
          });
        }
      }, 0);
    }

    return ctx;
  }

    module.exports = shareVSCodeEditor;
})();
