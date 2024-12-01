import React, { useState } from "react";
import axios from "../services/api";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log("Submitting login/register request:", { username, password });
      const response = await axios.post("/register", { username, password });
      console.log("Received response from server:", response.data);
      onLogin(response.data.userId); // Pass userId to the parent component
    } catch (err) {
        const errorMessage = err.response?.data?.message || "Registration failed";
        setError(errorMessage);
    }
  };

  return (
    <div>
      <h2>Login/Register</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default Login;
