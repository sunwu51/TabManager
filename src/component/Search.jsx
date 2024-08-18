/* eslint-disable react/prop-types */
/* global chrome */
import { Badge, Button, Card, Input, } from "@sunwu51/camel-ui"
import { useEffect, useRef, useState } from "react"
import { distance, embedding } from "../api/siliconflow";
import './Search.css'
import SetAuth from "./SetAuth";

function Search() {
  // const { tabs, historys, bookmarks } = props;
  const [filter, setFilter] = useState("");
  const [curWindow, setCurWindow] = useState(null);
  const [fromTabs, setFromTabs] = useState([])
  const [fromHistory, setFromHistory] = useState([])
  const [timestamp, setTimestamp] = useState(0)


  useEffect(() => {
    (async function _run() {
      // 获取当前所有已经打开的tabs，和对应的ai总结
      var tabs = await chrome.tabs.query({});
      var tabSum = await chrome.storage.local.get(tabs.map(t => "sum_" + t.id));
      if (filter.length == 0) {
        setFromTabs([])
        return;
      }
      // 获取3天内的历史纪录
      var historys = await chrome.history.search({ text: '', maxResults: 1000, startTime: Date.now() - 3 * 24 * 60 * 60 * 1000 })

      // 将输入的文本
      var arr = filter.toLowerCase().split(" ").filter(i => i.length > 0);

      // 从当前打开的tab中找到最相似的
      // 先按照字符contains搜索前10名
      var urls = new Set();
      var fromTabs = tabs.map(tab => ({ tab, score: lcs(arr, (tab.url + tab.title).toLowerCase()), summarize: tabSum["sum_" + tab.id] }))
        .filter(it => it.score > 0).sort((a, b) => {var d = b.score - a.score; if (d!=0) return d; else return b.tab.id-a.tab.id}).slice(0, 5);
      fromTabs.forEach(it => urls.add(it.tab.url));
      // 然后按照embedding搜索前10名，过滤掉前面已经出现的tab
      let {siliconKey: secretKey} = await chrome.storage.local.get({ siliconKey: ""})
      try {
        var p = await embedding(secretKey, filter)
        var { embeddings } = await chrome.storage.local.get({ embeddings: [] })
        var fromTabsExt = embeddings.map(emb => {
          var dis = distance(emb.vec, p);
          return { tabId: emb.tabId, dis }
        }).sort((a, b) => -a.dis + b.dis)
          .slice(0, 5);

        fromTabsExt = fromTabsExt.map(it => ({ tabId: it.tabId, tab: tabs.find(t => t.id == it.tabId), score: it.dis.toFixed(2), summarize: tabSum["sum_" + it.tabId] }))
          .filter(it => {
            if (!it.tab) {
              // 不存在的tab 删除
              chrome.storage.local.remove("sum_" + it.tabId);
              embeddings = embeddings.filter(emb => emb.tabId != it.tabId)
              chrome.storage.local.set({ embeddings })
              return false;
            }
            if (urls.has(it.tab.url)) {
              return false;
            }
            return true
          });
          // 合并结果
        setFromTabs([...fromTabs, ...fromTabsExt])
      } catch (e) {
        console.error(e)
        setFromTabs(fromTabs)
      }
      var fromHistory = historys.filter(it => urls.has(it.url) == false).map(it => ({ history: it, score: lcs(arr, (it.url + it.title).toLowerCase()) }))
        .filter(it => it.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

      setFromHistory(fromHistory)
    })()
  }, [filter, timestamp])


  useEffect(() => {
    chrome.windows.getCurrent().then(setCurWindow)

    // 如果有新标签打开或者旧的标签关闭等都触发重新渲染
    chrome.runtime.onMessage.addListener(function () {
      setTimestamp(new Date().getTime())
    });
  }, [])

  const searchRef = useRef(null);
  return (
    <>
      <Card>
        <div style={{ padding: "0" }} ref={searchRef} tabIndex="0">
          <div className="flex items-end">
            <Input label="搜索tab" onChange={setFilter} autoFocus={true} labelClassName="!text-sm !text-gray-500" inputClassName=" !min-h-8" />
            <SetAuth />
          </div>
          {fromTabs.length > 0 &&
            <Card>
              <ul>
                {
                  fromTabs.map((item, index) => (
                    <li key={index} className="font-bold" onMouseMove={() => searchRef.current.focus()} onMouseLeave={() => searchRef.current.focus()}>
                      <Button onPress={async () => {
                        if (item.tab.windowId != curWindow.id) {
                          await chrome.tabs.move(item.tab.id, { windowId: curWindow.id, index: -1 })
                        }
                        await chrome.tabs.update(item.tab.id, { active: true });
                      }}
                        className="w-full static m-0 bg-white text-start active:transform-none
                        hover:bg-[var(--w-yellow)] hover:text-black active:text-black focus:text-black active:bg-[var(--w-yellow)] p-0"
                      >
                        <div className="flex flex-col px-1 min-h-8 rounded-md justify-center">
                          <div className="flex items-center">
                            {
                              curWindow.id === item.tab.windowId ?
                                <Badge className={`bg-[var(--w-green-dark)] min-w-20`}>当前-{item.score}</Badge> :
                                <Badge className={`bg-[var(--w-blue)] min-w-20`}>其他-{item.score}</Badge>
                            }
                            &nbsp;
                            {item.tab.favIconUrl ? <img width="16px" src={item.tab.favIconUrl}></img> : null}
                            <p style={{
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden'
                            }}>{item.tab.title}</p>
                          </div>
                          <div className="details">
                            <p style={{
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden'
                            }}>
                              url: {item.tab.url}
                            </p>
                            <Card className="absolute left-0 m-1  bg-white" style={{ top: "calc(100% + .25rem)", width: "calc(100% - 10px)", fontWeight: "normal", padding: "1rem" }}>
                              <pre style={{ whiteSpace: 'pre-line' }}>
                                summary: {item.summarize}
                              </pre>
                            </Card>
                          </div>
                        </div>
                      </Button>
                    </li>
                  ))
                }
                {
                  fromHistory.map((item, index) => (
                    <li key={"h" + index} className="font-bold">
                      <Button onPress={async () => {
                        await chrome.tabs.create({ url: item.history.url })
                      }}
                        className="w-full static m-0 bg-white text-start active:transform-none
                        hover:bg-[var(--w-yellow)] focus:bg-[var(--w-red)] hover:text-black active:text-black focus:text-black active:bg-[var(--w-yellow)] p-0"
                      >
                        <div className="flex flex-col px-1 min-h-8 rounded-md justify-center">
                          <div className="flex items-center">
                            <Badge className={`min-w-20`}>{formatTime(Date.now() - item.history.lastVisitTime)}</Badge>
                            &nbsp;
                            {/* {item.tab.favIconUrl ? <img width="16px" src={item.tab.favIconUrl}></img> : null} */}
                            <p style={{
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden'
                            }}>{item.history.title}</p>
                          </div>
                          <div className="details">
                            <p style={{
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden'
                            }}>
                              url: {item.history.url}
                            </p>
                          </div>
                        </div>
                      </Button>
                    </li>
                  ))
                }
              </ul>
            </Card>}
        </div>
      </Card>
    </>
  )
}

function formatTime(ms) {
  var m = ms / 1000 / 60;
  if (m < 180) return Math.ceil(m) + '分钟前'
  if (m < 24 * 60) return Math.floor(m / 60) + '小时前'
  return Math.floor(m / 60 / 24) + '天前'
}

function lcs(words, text) {
  var res = 0;
  for (var i = 0; i < words.length; i++) {
    res += text.indexOf(words[i]) >= 0 ? 1 : 0;
  }
  return res;
}

export default Search
