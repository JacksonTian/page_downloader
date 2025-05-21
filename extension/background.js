// Show the demo page once the extension is installed
chrome.runtime.onInstalled.addListener((_reason) => {
  chrome.tabs.create({
    url: 'demo/index.html'
  });
});
