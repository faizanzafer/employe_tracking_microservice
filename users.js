const { response } = require("express");
const jwt_decode = require("jwt-decode");
const axios = require("axios").default;

const BASE_URL = "https://usertracking.onewoodsolutions.com/api";

const users = [];

const addUser = async ({ token, socketId, is_admin = false }) => {
  if (!token) return { error: "Token is required." };
  try {
    const { error: err, userData } = getUserFromToken(token);
    if (err) {
      return { error: err };
    }

    const id = userData.id;
    const existingUser = users.find((user) => user.id == id);

    if (existingUser) return { error: "This User is already Connected." };
    console.log("here");
    const response = await axios.get(`${BASE_URL}/auth/me`, CONFIG(token));

    const { name, email, picture_url, role } = response.data.data;
    if (is_admin == false && role == 1) {
      return { error: "only employee are allowed to join socket" };
    }
    if (is_admin == true && role == 2) {
      return { error: "only Admins are allowed to join socket" };
    }

    const user = { id, name, email, picture_url, role, socketId, token };
    users.push(user);
    console.log(users);
    return { user };
  } catch (err) {
    if (err && err.response && err.response.data && err.response.data.error) {
      return { error: err.response.data.error };
    }
    return { error: err };
  }
};

const removeUser = (socketId) => {
  const index = users.findIndex((user) => user.socketId === socketId);

  if (index !== -1) return users.splice(index, 1)[0];
};

const updateUser = (id, lat, long, delta) => {
  const user = getUser(id);
  const index = users.indexOf(user);
  if (index >= 0) {
    users[index].lat = lat;
    users[index].long = long;
    users[index].latDelta = delta;
    users[index].longDelta = delta;
  }
  return getUser(id);
};

const getUserFromToken = (token) => {
  if (!token) return { error: "Token is required." };

  try {
    const data = jwt_decode(token);
    if (!data) return { error: "Invalid Token." };

    const userData = data.user;
    if (!userData) return { error: "Invalid token." };
    const id = userData.id;

    if (!id) return { error: "invalid token." };

    const datetime = Math.round(Date.now() / 1000);

    if (datetime >= data.exp) return { error: "token expired." };
    console.log(id);
    return { userData };
  } catch (err) {
    return { error: err.message };
  }
};

const getActiveUsers = () =>
  users.filter((user) => user.lat && user.lat != null);

const getUser = (id) => users.find((user) => user.id === id);

const CONFIG = (token) => {
  return {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };
};

module.exports = {
  addUser,
  updateUser,
  removeUser,
  getUser,
  getActiveUsers,
  getUserFromToken,
};
