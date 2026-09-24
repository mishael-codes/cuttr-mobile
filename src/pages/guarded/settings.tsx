// ****************** firebase imports
import {
  updateProfile,
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import auth from "../../firebase/auth";

// ****************** React Hooks
import { useState } from "react";

// ****************** React Router
import { useNavigate } from "react-router-dom";

// ****************** Component Import
import Offline from "../../components/offline";
import Loader from "../../components/loader/loader";
import ErrorModal from "../../components/modals/errorModal";

const Settings: React.FC = () => {
  const [userName, setUserName] = useState("");
  const [deleteModal, setDeleteModal] = useState(false);
  const [authenticate, setAuthenticate] = useState("");
  const [errorModal, setErrorModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [modalMessage, setModalMessage] = useState("")

  // ****************** get current user
  const user = auth.currentUser;

  // ****************** handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setUserName(name);
  };

  // ****************** update user profile
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();

    if (user) {
      updateProfile(user, {
        displayName: userName,
      })
        .then(() => {
          navigate("/settings");
        })
        .catch((error) => {
          console.log(error.code);
        });
    }
  };

  // ****************** sign out user
  const navigate = useNavigate();
  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut(auth).then(() => {
      navigate("/signin");
    });
  };

  // ****************** delete user account

  const authenticatePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    const confirmPassword = e.target.value;
    setAuthenticate(confirmPassword);
    setErrorModal(false);
  };

  const showDeleteModal = () => {
    setDeleteModal(true);
  };

  const handleDeleteUser = async (password: string) => {
    setIsLoading(true)
    const userEmail = user?.email ? user?.email : "";
    if (user) {
      const credential = EmailAuthProvider.credential(userEmail, password);
      try {
        await reauthenticateWithCredential(user, credential);
        await deleteUser(user).then(() => {
          navigate("/");
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        setIsLoading(false)
        const errorCode = error.code;

        if (errorCode === "auth/invalid-credential") {
          setIsLoading(false);
          setErrorModal(true);
          setModalMessage("Wrong password, try again.");
        } else if (errorCode === "auth/network-request-failed") {
          setIsLoading(false);
          setErrorModal(true);
          setModalMessage("Network error, please try again later");
        }
      }
    }
  };
  return navigator.onLine ? (
    <>
      <div
        className={`absolute transition-all w-screen flex items-center flex-col ${errorModal ? "top-32 md:top-35" : "-top-36"
          }`}
      >
        {errorModal ? <ErrorModal error={modalMessage} /> : ""}
      </div>
      {isLoading && <Loader />}
      <div className="max-w-xl mx-auto px-5 py-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-6">
          Welcome <span className="text-gradient">{auth.currentUser?.displayName || "User"}</span>,
        </h1>
        <form onSubmit={handleUpdateProfile} className="glass-card border border-white/10 rounded-2xl p-6 mb-6">
          <label htmlFor="username" className="flex flex-col mb-4 text-sm font-semibold text-text-muted">
            Update your username
            <input
              type="text"
              name="username"
              id="username"
              placeholder={user?.displayName ? user?.displayName : "Johnie"}
              className="w-full p-3.5 rounded-xl bg-surface/60 border border-white/10 text-white focus:outline-none focus:border-accent mt-1.5 transition-colors placeholder:text-text-muted/40"
              onChange={handleChange}
            />
          </label>
          <label htmlFor="email" className="flex flex-col mb-4 text-sm font-semibold text-text-muted">
            Update your email
            <input
              type="text"
              name="email"
              id="email"
              placeholder={user?.email ? user?.email : "johndoe@gmail.com"}
              className="w-full p-3.5 rounded-xl bg-surface/40 border border-white/5 text-text-muted focus:outline-none mt-1.5 cursor-not-allowed"
              onChange={handleChange}
              disabled
            />
          </label>
          <label htmlFor="password" className="flex flex-col mb-6 text-sm font-semibold text-text-muted">
            Reset your password
            <input
              type="password"
              name="password"
              id="password"
              placeholder="••••••••"
              className="w-full p-3.5 rounded-xl bg-surface/40 border border-white/5 text-text-muted focus:outline-none mt-1.5 cursor-not-allowed"
              onChange={handleChange}
              disabled
            />
          </label>
          <button className="w-full py-3 px-6 rounded-xl bg-accent font-bold text-black hover:bg-accent2 transition-colors active:scale-95">
            Save
          </button>
        </form>

        {/* Mobile App Section */}
        <div className="glass-card border border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="font-display font-bold text-lg text-white mb-2">Cuttr Mobile App</h3>
          <p className="text-sm text-text-muted mb-4">
            Written with Expo &amp; React Native for native iOS and Android performance.
          </p>
          <div className="space-y-2 text-xs text-text-muted">
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span>Framework</span>
              <span className="text-accent font-semibold">React Native (Expo SDK 51)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span>Platforms</span>
              <span className="text-white font-medium">iOS, Android, Web</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>EAS Build Status</span>
              <span className="text-emerald-400 font-medium">Configured &amp; Ready</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
          <button
            onClick={handleSignOut}
            data-testid="signout"
            className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-surface-light border border-white/10 text-white font-semibold hover:border-accent hover:text-accent transition-colors"
          >
            Sign Out
          </button>
          <button
            onClick={showDeleteModal}
            className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-semibold hover:bg-red-500/25 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {deleteModal ? (
        <div className="h-fit absolute top-2/4 left-2/4 -translate-x-2/4 -translate-y-2/4 bg-background p-6 rounded-lg flex items-center justify-evenly flex-col shadow-md shadow-accent">
          <p className=" font-bold text-accent">You&apos;re leaving?</p>
          <p>Are you sure you want to go?</p>
          <form className="flex flex-col">
            <input
              type="password"
              onChange={authenticatePassword}
              autoComplete="password"
              placeholder="Please enter your password"
              className="h-3 w-72 p-6 rounded-lg bg-transparent border border-accent focus:outline-none focus:border-2 mt-2"
            />
            <button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                if (authenticate) {
                  handleDeleteUser(authenticate);
                } else {
                  setErrorModal(true);
                  setModalMessage("Please enter your password");
                }
              }}
              className="h-12 rounded-lg bg-accent font-bold text-background p-3 mt-4 border border-accent hover:bg-transparent hover:text-accent transition-all"
            >
              Yes, delete
            </button>
            <button
              type="submit"
              onClick={() => {
                setDeleteModal(false);
              }}
              className="h-12 rounded-lg bg-shadow font-bold text-background p-3 mt-4 border border-background hover:border-accent hover:bg-background hover:text-accent transition-all"
            >
              No, cancel
            </button>
          </form>
        </div>
      ) : (
        ""
      )}
    </>
  ) : (
    <Offline />
  );
};

export default Settings;
