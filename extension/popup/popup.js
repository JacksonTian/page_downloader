const templateFn = function (ctx) {
  return `
<html lang="zh-CN">
<head>
<title>${ctx.title}</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="url" content="${ctx.url}">
<style>
body {
  width: 1054px;
  background-color: #969696;
  margin: 0 auto;
}
body img {
  max-width: 600px;
}
#body-content {
  background-color: #fff;
  padding: 0 64px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2), 0 6px 20px rgba(0, 0, 0, 0.19);
}
</style>
</head>
<body>
<div id="body-content">
${ctx.body}
</div>
</body>
</html>
`;
}

document.addEventListener('DOMContentLoaded', async function() {
  const downloadBtn = document.getElementById('downloadBtn');

  const result = await chrome.storage.sync.get('listItems');
  const listItems = result.listItems || [];
  // 获取当前活跃tab的URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); // 新增：获取活跃tab
  const currentUrl = tab.url; // 新增：使用tab的url属性
  const url = new URL(currentUrl);
  const find = listItems.find((item) => {
    // 将通配符转换为正则表达式进行匹配
    const matcher = item.matcher;
    const regex = new RegExp(
      '^' + 
      matcher.replace(/([.+?^=!:${}()|\[\]\/\\])/g, '\\$1') // 转义其他正则特殊字符
        .replace(/\*/g, '.*') // 将*转为.*
      + '$',
      'i'
    );
    return regex.test(url.origin + url.pathname);
  });

  downloadBtn.classList.toggle('avaliable', find != null);

  downloadBtn.addEventListener('click', async () => {
    if (!find) {
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // remove injected css
    await chrome.scripting.removeCSS({
      target: { tabId: tab.id },
      files: ['styles/inject.css']
    });

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (titleSelector, bodySelector) => {
        const body = document.querySelector(bodySelector).outerHTML;
        const url = new URL(window.location.href);
        let improvedBody = body.replace(/src="\/\//g, `src="${url.protocol}//`);
        return {
          title: document.querySelector(titleSelector).innerText.trim(),
          body: improvedBody
        };
      },
      args: [find.title, find.body]
    });

    if (result && result[0]) {
      const {title, body} = result[0].result;

      const blob = new Blob([templateFn({title, body, url: currentUrl})], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  });

  const previewBtn = document.getElementById('previewBtn');
  previewBtn.classList.toggle('avaliable', find != null);
  previewBtn.addEventListener('click', async () => {
    if (find) {
      // High light the matched item
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['styles/inject.css']
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (titleSelector, bodySelector) => {
          const titleNode = document.querySelector(titleSelector);
          if (titleNode) {
            titleNode.classList.add('page_downloader_highlight');
            setTimeout(() => {
              titleNode.classList.remove('page_downloader_highlight');
            }, 3000);
          }

          const bodyNode = document.querySelector(bodySelector);
          if (bodyNode) {
            bodyNode.classList.add('page_downloader_highlight');
            setTimeout(() => {
              bodyNode.classList.remove('page_downloader_highlight');
            }, 3000);
          }

          return {
            title: titleNode ? true : false,
            body: bodyNode ? true : false
          };
        },
        args: [find.title, find.body]
      });
    }
  });
});

