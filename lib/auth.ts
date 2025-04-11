import { getAuth, signOut } from "firebase/auth";
import { app } from "./firebase";

const auth = getAuth(app);

const logout = () => signOut(auth);

export { auth, logout };
