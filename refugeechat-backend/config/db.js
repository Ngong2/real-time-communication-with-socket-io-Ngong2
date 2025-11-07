const mongoose = require("mongoose");

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`AReL Tech Chat MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }

  // Monitor connection events
  mongoose.connection.on("disconnected", () => {
    console.warn(" MongoDB disconnected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB error:", err.message);
  });
}

module.exports = { connectDB };
