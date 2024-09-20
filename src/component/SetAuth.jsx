/* global chrome */
import { Button, Dialog, Input } from "@sunwu51/camel-ui";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const defaultModel = "Qwen/Qwen2.5-7B-Instruct"
export default function SetAuth() {
  let [key, setKey] = useState("");
  let [model, setModel] = useState(defaultModel);
  useEffect(() => {
    chrome.storage.local.get({ siliconKey: "", model: defaultModel }).then(res => {
      setKey(res.siliconKey);
      setModel(res.model)
    });
  }, [])
  return (
    <>
      <Dialog trigger={<Button className="w-16">设置</Button>}>
        <Input label="silicon cloud key" labelClassName="!text-sm !text-gray-500" inputClassName=" !min-h-8" defaultValue={key} onChange={setKey} />
        <Input label="model" labelClassName="!text-sm !text-gray-500" inputClassName=" !min-h-8" defaultValue={model} onChange={setModel} />
        <Button onPress={async () => {await chrome.storage.local.set({ siliconKey: key, model: model }); toast.success("设置成功");}}>确定</Button>
      </Dialog>
    </>
  )
}