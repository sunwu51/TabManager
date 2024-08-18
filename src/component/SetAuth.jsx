/* global chrome */
import { Button, Dialog, Input } from "@sunwu51/camel-ui";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function SetAuth() {
  let [key, setKey] = useState("");
  useEffect(() => {
    console.log(123)
    chrome.storage.local.get({ siliconKey: "" }).then(res => {
      setKey(res.siliconKey);
    });
  }, [])
  return (
    <>
      <Dialog trigger={<Button className="w-16">设置</Button>}>
        <Input label="silicon cloud key" labelClassName="!text-sm !text-gray-500" inputClassName=" !min-h-8" defaultValue={key} onChange={setKey} />
        <Button onPress={async () => {await chrome.storage.local.set({ siliconKey: key }); toast.success("设置成功");}}>确定</Button>
      </Dialog>
    </>
  )
}