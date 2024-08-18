import { Toaster } from "react-hot-toast";
import Group from "./component/Group";
import Search from "./component/Search";

function App() {
  return (
    <>
      <div>
        <Toaster />
      </div>
      <div className="p-1 relative">
        <Search />
        <Group />
      </div>
    </>
  )
}
export default App; 
