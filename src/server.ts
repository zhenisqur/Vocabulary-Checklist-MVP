import express from "express";
import path from "path";
import expressLayouts from "express-ejs-layouts";
import session from "express-session";
import router from "./routes/word.routes";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    username?: string;
    avatarUrl?: string | null;
  }
}

const app = express();

app.use(express.static(path.join(__dirname, "../public")));
app.use(expressLayouts); 
app.set("layout", "layout");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'vocalubary-secret-key-123',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
    res.locals.username = (req.session as any).username || 'Zhenis';

    const avatarUrl = (req.session as any).avatarUrl;
    res.locals.avatarUrl = avatarUrl || null;
    res.locals.path = req.path;
    next();
});

app.use("/", router);

app.listen(3000, () => {
  console.log("Локал:http://localhost:3000");
});

