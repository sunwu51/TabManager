/* global chrome */
import { Button, Card, Checkbox, Input } from "@sunwu51/camel-ui";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function Group() {
    let [reuse, setReuse] = useState(false);
    let [groupRule, setGroupRule] = useState("");

    useEffect(() => {
        // (async function _run() {

        // })()
        const syncReuse = async () => {
            let { reuse: reuseFromStorage } = await chrome.storage.local.get({ reuse: false });
            if (reuseFromStorage != reuse) {
                setReuse(reuseFromStorage);
            }
        }
        syncReuse();
        var timer = setInterval(syncReuse, 500)
        return () => clearInterval(timer)
    }, [reuse])

    async function reuseChange(value) {
        let { reuse: reuseFromStorage } = await chrome.storage.local.get({ reuse: false });
        if (reuseFromStorage != value) {
            await chrome.storage.local.set({ reuse: value })
            setReuse(value)
        }
    }

    async function triggerGroup() {
        // 正则格式 可以是 google  谷歌#google，前者代表组名和正则都是google
        var m = groupRule.match(/^((.+)#)?(.+)$/)
        if (m) {
            var groupName = m[2] ? m[2] : m[3];
            var regex = new RegExp(m[3]);
            var tabs = await chrome.tabs.query({});
            tabs = tabs.filter(item => item.url && item.url.match(regex));
            if (tabs.length <= 0) {
                toast.error("没有符合条件的tabs")
                return
            }
            var groups = await chrome.tabGroups.query({ title: groupName });
            
            console.log({groupName, tabs, groups})
            // 已经存在同名group，则把所有的tab加入到已存在的group中
            var groupId;
            if (groups && groups.length) {
                groupId = groups[0].id;
                await chrome.tabs.group({ groupId, tabIds: tabs.map(it => it.id) });
            } else {
                groupId = await chrome.tabs.group({ tabIds: tabs.map(it => it.id) });
                await chrome.tabGroups.update(groupId, { title: groupName })
            }
            // await chrome.tabGroups.move(groupId, {index: 0, windowId: chrome.windows.WINDOW_ID_CURRENT});
        } else {
            toast.error("输入不合法~");
        }
    }


    return <>
        <Card>
            <Input label="分组与复用" labelClassName="!text-sm !text-gray-500" inputClassName=" !min-h-8" onChange={setGroupRule} placeholder="分组名#url正则" />
            <div className="flex justify-between items-center">
                <Button className="w-48" onPress={triggerGroup}>立即分组</Button>
                <span className="text-[1rem]"><Checkbox isSelected={reuse} onChange={reuseChange}>复用tab</Checkbox></span>
            </div>
        </Card>
    </>
}