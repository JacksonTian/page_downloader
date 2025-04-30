class Item {
  constructor(matcher, title, body) {
    this.matcher = matcher;
    this.title = title;
    this.body = body;
  }
}

function delegate(container, event, selector, handler) {
  container.addEventListener(event, (e) => {
    const target = e.target;
    const match = target.closest(selector);
    if (match) {
      handler(e);
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const itemTpl = document.getElementById('listItemTemplate').innerHTML;
  // 初始化表单数据
  const { listItems } = await chrome.storage.sync.get(['listItems']);

  const container = document.getElementById('listContainer');

  renderList(listItems || []);

  // 新增列表功能
  document.getElementById('addItemBtn').addEventListener('click', async () => {
    const url = document.getElementById('url');
    const title = document.getElementById('title');
    const body = document.getElementById('body');
    const result = await chrome.storage.sync.get('listItems');
    const listItems = result.listItems || [];
    listItems.push(new Item(url.value, title.value, body.value));
    await chrome.storage.sync.set({ listItems });
    renderList(listItems);
    // clean form
    url.value = '';
    title.value = '';
    body.value = '';
  });

  // 新增事件委托逻辑
  delegate(container, 'click', '.edit-btn', handleEdit);
  delegate(container, 'click', '.save-btn', handleSave);
  delegate(container, 'click', '.delete-btn', handleDelete);

  // 渲染列表
  function renderList(list) {
    container.innerHTML = list.map((item, index) => `
      <li data-index="${index}">
        ${item.matcher}
        ${item.title}
        ${item.body}
        <button class="edit-btn">编辑</button>
        <button class="delete-btn">删除</button>
      </li>`
    ).join('');
  }

  // 编辑/保存处理
  async function handleEdit(e) {
    const li = e.target.closest('li');
    const index = li.dataset.index;
    const items = await chrome.storage.sync.get('listItems');
    const list = items.listItems;
    const item = list[index];
    li.innerHTML = itemTpl;
    li.querySelector('.edit-matcher').value = item.matcher;
    li.querySelector('.edit-title').value = item.title;
    li.querySelector('.edit-body').value = item.body;
  }

  async function handleSave(e) {
    const li = e.target.closest('li');
    const index = li.dataset.index;
    const items = await chrome.storage.sync.get('listItems');
    const list = items.listItems;
    const item = list[index];
    item.matcher = li.querySelector('.edit-matcher').value.trim();
    item.title = li.querySelector('.edit-title').value.trim();
    item.body = li.querySelector('.edit-body').value.trim();
    await chrome.storage.sync.set({ listItems: list });
    renderList(list);
  }

  // 删除处理
  async function handleDelete(e) {
    const li = e.target.closest('li');
    const index = li.dataset.index;
    const items = await chrome.storage.sync.get('listItems');
    const list = items.listItems.filter((_, i) => i !== parseInt(index));
    await chrome.storage.sync.set({ listItems: list });
    renderList(list);
  }

});