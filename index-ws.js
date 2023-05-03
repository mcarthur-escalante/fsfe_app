const express = require("express");
const server = require("http").createServer();
const app = express();

app.get("/", function (req, res) {
  res.sendFile("index.html", { root: __dirname });
});

server.on("request", app);

server.listen(3000, function () {
  console.log("Listening on port 3000");
});

const db = setupDatabase();
const wss = setupWebSocketServer();

process.on("SIGINT", () => {
  console.log("--- sigint ---");
  wss.clients.forEach(client => {
    client.close();
  });
  server.close(() => {
    db.shutdownDB();
  });
});

function setupWebSocketServer() {

  const WebSocketServer = require("ws").Server;
  const wss = new WebSocketServer({ server });

  wss.on("connection", function connection(ws) {
    const numClients = wss.clients.size;
    console.log("Clients connected", numClients);
    wss.broadcast(`Current visitors: ${numClients}`);

    if (ws.readyState === ws.OPEN) {
      ws.send("Welcome to my server");
    }

    db.insertCount(numClients);

    ws.on("close", function close() {
      wss.broadcast(`Current visitors: ${numClients}`);
      console.log("A client has disconnected");
    });
  });

  wss.broadcast = function broadcast(data) {
    wss.clients.forEach((client) => {
      client.send(data);
    });
  };

  return wss;
}

function setupDatabase() {
  const sqlite = require("sqlite3");
  const db = new sqlite.Database(":memory:");

  db.serialize(() => {
    db.run(`
        CREATE TABLE visitors
        (
            count INTEGER,
            time  TEXT
        )
    `);
  });

  function insertCount(count) {
    db.run(`INSERT INTO visitors (count, time) VALUES(${count}, DATETIME('now'))`);
  }

  function getCounts() {
    db.each("SELECT * FROM visitors", (err, row) => {
      console.log(row);
    });
  }

  function shutdownDB() {
    getCounts();
    console.log("Shutting down DB");
    db.close();
  }

  return {
    insertCount,
    shutdownDB,
  };

}
