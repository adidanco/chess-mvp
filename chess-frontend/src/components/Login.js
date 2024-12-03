import React, { useState } from "react";
import axios from "../services/api";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear any previous error
    console.log("Sending payload:", JSON.stringify({ username, password })); // Log the request payload
    try {
      
      const response = await axios.post("/register", { username, password });
      console.log("Registration success:", JSON.stringify(response.data)); // Log the response
      // Pass userId to the parent component
      if (response.data?.userId) {
        onLogin(response.data.userId);
      } else {
        setError('Invalidd response from server');
      } 
    } catch (err) {
        console.error("Error occurred during registration:", JSON.stringify(err)); // Log the full error
        const errorMessage = err.response?.data?.message || "Registration failed";
        setError(errorMessage);
    }
  };

  return (
    <div>
      <h2>Login/Register</h2>
      {error && <p style={{ color: "red" }}>{JSON.stringify(error)}</p>}
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
