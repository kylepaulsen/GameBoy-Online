function cout(message, colorIndex) {
	var terminal_output = getOrCreateElementById("terminal_output");
	if ((colorIndex != 0 || DEBUG_MESSAGES) && (colorIndex != -1 || DEBUG_WINDOWING)) {
		var lineout = document.createElement('span');
		lineout.appendChild(document.createTextNode(message));
		switch (colorIndex) {
			case -1:
			case 0:
				lineout.className = "white";
				console.log(message);
				break;
			case 1:
				lineout.className = "yellow";
				console.warn(message);
				break;
			case 2:
				lineout.className = "red";
				console.error(message);
		}
		terminal_output.appendChild(lineout);
		terminal_output.appendChild(document.createElement('br'));
		terminal_output.scrollTop = terminal_output.scrollHeight - terminal_output.clientHeight;
	}
}
function clear_terminal() {
	var terminal_output = getOrCreateElementById("terminal_output");
	while (terminal_output.firstChild != null) {
		terminal_output.removeChild(terminal_output.firstChild);
	}
}