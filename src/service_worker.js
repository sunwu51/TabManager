import { summarize, embedding } from "./api/siliconflow";

/* global chrome */

// 点击action的时候打开Panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// 页面dom加载完成事件
chrome.webNavigation.onDOMContentLoaded.addListener(async e => {
    if (e.url && e.url.length > 0 && e.url !== 'about:blank' && e.tabId && e.frameId === 0 && e.url.startsWith("http")) {
        console.log(e)
        let { reuse } = await chrome.storage.local.get({ reuse: false });
        if (reuse) {
            var url = e.url.split("#")[0];
            var tabs = await chrome.tabs.query({});
            tabs = tabs.filter(it => it.id != e.tabId && it.url.split("#")[0] === url)
            if (tabs.length > 0) {
                var oldTab = tabs[0];
                var curWindow = await chrome.windows.getCurrent({})
                if (oldTab.windowId != curWindow.id) {
                    await chrome.tabs.move(oldTab.id, { windowId: curWindow.id, index: -1 })
                }
                await chrome.tabs.update(oldTab.id, { active: true });
                await chrome.tabs.remove([e.tabId])
            }
        }
        try {
            // 注入content脚本，来获取当前页面的内容，通过消息方式接收页面内容
            await chrome.scripting.executeScript({
                target: { tabId: e.tabId },
                files: ['content.js']
            }); 
        } catch (e) {/* ignore */}
    }
});

// 页面所有元素加载完成事件，比onDOMContentLoaded靠后  
chrome.webNavigation.onCompleted.addListener(async e => {
    if (e.tabId && e.url && e.url.startsWith("http") && e.frameId === 0) {
        try {
            await chrome.runtime.sendMessage({ type: 'open', tabId: e.tabId });
        } catch (e) {/* ignore */} 
        console.log("onCompleted", e);
    }
});

// tab关闭事件
chrome.tabs.onRemoved.addListener(async function (tabId) {
    try { await chrome.runtime.sendMessage({ type: 'close', tabId });} catch (e) {/* ignore */} 
    // 删除缓存中的摘要
    chrome.storage.local.remove("sum_" + tabId)
    // 删除缓存中的向量
    let { embeddings } = await chrome.storage.local.get({ embeddings: [] });
    embeddings = embeddings.filter(it => it.tabId != tabId)
    chrome.storage.local.set({ embeddings })
});

// active更新
chrome.tabs.onActivated.addListener(async function (activeInfo) {
    try { await chrome.runtime.sendMessage({ type: 'active', tabId: activeInfo.tabId });} catch (e) {/* ignore */} 
});

// 监听sidepanel发送过来的消息
chrome.runtime.onMessage.addListener(async (msg, sender,) => {
    let { siliconKey: secretKey } = await chrome.storage.local.get({ siliconKey: "" })
    if (msg.type === 'summarize') {
        const tabId = sender.tab ? sender.tab.id : null;
        if (tabId) {
            // 将页面的内容用ai进行摘要和嵌入，并存储这两个结果
            const summary = await summarize(secretKey, msg.content);
            let key = `sum_${tabId}`;
            let s = {}
            s[key] = summary;
            await chrome.storage.local.set(s);
            const vec = await embedding(secretKey, summary);
            let { embeddings } = await chrome.storage.local.get({ embeddings: [] });
            embeddings = embeddings.filter(it => it.tabId != tabId);
            embeddings.push({ tabId, vec, timestamp: new Date().getTime() });
            await chrome.storage.local.set({ embeddings })
        }
    }
});