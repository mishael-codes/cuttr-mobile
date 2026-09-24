// ****************** React Hook
import { useState, useEffect } from "react";

// ****************** React Router
import { useNavigate } from "react-router-dom";

const NotFound: React.FC = () => {
  const [count, setCount] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    if (count <= 0) {
      navigate("/");
      return;
    }
    const timer = setTimeout(() => {
      setCount((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [count, navigate]);

  return (
    <div className="h-screen flex items-center justify-center flex-col text-text">
      <h1 className="font-bold text-4xl">
        <span className="text-accent">Page</span> Not Found
      </h1>
      <div className="mt-5 w-[350px] text-center">
        <p>
          Redirecting to Cuttr in {count} {count === 1 ? "second" : "seconds"}...
        </p>
      </div>
    </div>
  );
};

export default NotFound;
