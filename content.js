function captureAndSend() {
  html2canvas(document.querySelector('video')).then(canvas => {
    const dataURL = canvas.toDataURL('image/jpeg');
    const base64Image = dataURL.split(',')[1];

    fetch('http://localhost:5000/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image })
    })
    .then(res => res.json())
    .then(data => {
      chrome.runtime.sendMessage({
        type: "focus_status",
        focused: data.focused
      });
    });
  });
}

// Run every 10 seconds
setInterval(captureAndSend, 10000);
