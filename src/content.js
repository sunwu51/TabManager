/* global chrome */
console.log('Content script loaded');
const url = document.URL
const title = document.title
let pageContent = document.body.innerText;

if (url.includes("www.baidu.com")) {
    pageContent = document.querySelector("#content_left").innerText;
}

// 向 Service Worker 发送消息
chrome.runtime.sendMessage({ type: 'summarize', content: url + title +  pageContent });