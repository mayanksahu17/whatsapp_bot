chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ loggedIn: false });
  });
  
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && /linkedin.com/.test(tab.url)) {
      chrome.storage.local.get(['loggedIn'], (result) => {
        if (result.loggedIn) {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          });
        }
      });
    }
  });
  