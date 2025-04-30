const templateFn = function (ctx) {
  return `
<html>
<head>
<title>${ctx.title}</title>
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
${ctx.body};
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
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (titleSelector, bodySelector) => {
        return {
          title: document.querySelector(titleSelector).innerText.trim(),
          body: document.querySelector(bodySelector).outerHTML
        };
      },
      args: [find.title, find.body]
    });

    if (result && result[0]) {
      const {title, body} = result[0].result;

      const blob = new Blob([templateFn({title, body})], { type: 'text/html' });
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
});

