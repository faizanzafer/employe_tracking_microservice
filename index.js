const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const cors = require("cors");
const axios = require("axios").default;

const router = require("./router");
const {
  addUser,
  updateUser,
  removeUser,
  getUser,
  getActiveUsers,
  getUserFromToken,
} = require("./users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on("connect", (socket) => {
  socket.on("employee_join", async ({ token }, callback) => {
    try {
      const { error, user } = await addUser({ token, socketId: socket.id });
      if (error) return callback(getError(error));
      callback(getSuccess("User Connected to Socket Successfully"));
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("admin_join", async ({ token }, callback) => {
    try {
      const { error, user } = await addUser({
        token,
        socketId: socket.id,
        is_admin: true,
      });
      if (error) return callback(getError(error));

      socket.join("admin_room");

      callback(getSuccess("admin Connected to Socket Successfully"));
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("getActiveUsers", ({ token }, callback) => {
    try {
      const { error, userData } = getUserFromToken(token);
      if (error) {
        console.log("getUserFromTokenError", error);
        return callback(getError(error));
      }
      const user_id = userData.id;
      const user = getUser(user_id);
      if (!user) {
        console.log("Un Registered Sockets cannot use this event __");
        return callback(
          getError("Un Registered Sockets cannot use this event")
        );
      }
      if (user.role && user.role != 1) {
        console.log("only Admins can use this socket __");
        return callback(getError("only Admins can use this socket"));
      }

      const active_users = getActiveUsers();
      console.log("active_users :", active_users);
      callback(active_users);
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("updateLocation", ({ token, lat, long }, callback) => {
    try {
      if (!token || !lat || !long)
        return callback(
          getError(
            "Parameters are not valid. token should be a token:JWT variable and lat,long variable."
          )
        );

      const { error, userData } = getUserFromToken(token);
      if (error) {
        return callback(getError(error));
      }

      const user_id = userData.id;
      const user = getUser(user_id);
      if (!user) {
        console.log("Un Registered Sockets cannot use this event ++");
        return callback(
          getError("Un Registered Sockets cannot use this event")
        );
      }
      if (user.role && user.role != 2) {
        console.log("only Employees can use this socket ++");
        return callback(getError("only Employees can use this socket"));
      }

      const updated_user = updateUser(user_id, lat, long, 0.009);
      socket.to("admin_room").emit("updateLocation", updated_user);
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("joinRoom", ({ token }, callback) => {
    try {
      const { error, userData } = getUserFromToken(token);
      if (error) {
        console.log("getUserFromTokenError", error);
        return callback(getError(error));
      }
      const user_id = userData.id;
      const user = getUser(user_id);
      if (!user) {
        console.log("Un Registered Sockets cannot use this event __");
        return callback(
          getError("Un Registered Sockets cannot use this event")
        );
      }
      if (user.role && user.role != 1) {
        console.log("only Admins can use this socket __");
        return callback(getError("only Admins can use this socket"));
      }

      console.log("admin :", user, "joining room");
      socket.join("admin_room");
      callback("you joined admin room");
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("leaveRoom", ({ token }, callback) => {
    try {
      const { error, userData } = getUserFromToken(token);
      if (error) {
        console.log("getUserFromTokenError", error);
        return callback(getError(error));
      }
      const user_id = userData.id;
      const user = getUser(user_id);
      if (!user) {
        console.log("Un Registered Sockets cannot use this event __");
        return callback(
          getError("Un Registered Sockets cannot use this event")
        );
      }
      if (user.role && user.role != 1) {
        console.log("only Admins can use this socket __");
        return callback(getError("only Admins can use this socket"));
      }

      console.log("admin :", user, "isLeaving room");
      socket.leave("admin_room");
      callback("you left admin room");
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("offLocation", ({ token }, callback) => {
    try {
      if (!token)
        return callback(
          getError(
            "Parameters are not valid. token should be a token:JWT variable and lat,long variable."
          )
        );

      const { error, userData } = getUserFromToken(token);
      if (error) {
        return callback(getError(error));
      }
      const user_id = userData.id;
      const user = getUser(user_id);
      if (!user) {
        console.log("Un Registered Sockets cannot use this event ++");
        return callback(
          getError("Un Registered Sockets cannot use this event")
        );
      }
      if (user.role && user.role != 2) {
        console.log("only Employees can use this socket ++");
        return callback(getError("only Employees can use this socket"));
      }

      const updated_user = updateUser(user_id, null, null, null);
      console.log("updated_user :", user_id, updated_user);
      return callback();
      // socket.to("admin_room").emit("updateLocation", updated_user);
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected", socket.id);
    const user = removeUser(socket.id);
    console.log("user disconnected", user);
    if (user && user.role && user.role == 1) {
      socket.leave("admin_room");
    }
  });
});

server.listen(process.env.PORT || 5002, () =>
  console.log(`Server has started on port ${process.env.PORT || 5002}`)
);

const getError = (errorString) => {
  return {
    error: errorString,
  };
};

const getSuccess = (successString) => {
  return {
    data: successString,
  };
};

const CONFIG = (token) => {
  return {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };
};
