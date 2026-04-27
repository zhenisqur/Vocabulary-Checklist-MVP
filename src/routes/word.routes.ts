import { Router } from "express";
import fs from "fs";
import path from "path";
import db from "../config/db"; 
import * as wordController from "../controllers/word.controller"; 
import { isAuthenticated } from "../middlewares/validation.middleware";

const router = Router();

router.get("/auth", (req, res) => {
    res.render("auth", { layout: false }); 
});
router.post("/login", wordController.loginUser);

router.get("/register", (req, res) => {
    res.render("register", { layout: false });
});
router.post("/register", wordController.registerUser);

router.get("/logout", (req, res) => {
    const session = req.session as any;
    session.destroy(() => {
        res.redirect("/auth");
    });
});

router.post("/logout", (req, res) => {
    const session = req.session as any;
    session.destroy(() => {
        res.redirect("/auth");
    });
});

router.get("/", isAuthenticated, wordController.getDashboard); 
router.get("/dashboard", isAuthenticated, wordController.getDashboard);
router.get("/profile", isAuthenticated, wordController.getProfilePage);
router.post("/profile/update", isAuthenticated, wordController.updateProfile);
router.post("/profile/upload-avatar", isAuthenticated, wordController.upload.single("avatar"), wordController.uploadAvatar);

router.get("/words", isAuthenticated, wordController.getWords);
router.get("/active", isAuthenticated, wordController.getActiveWords);
router.get("/graveyard", isAuthenticated, wordController.getGraveyard);

router.get('/library', isAuthenticated, (req, res) => {
    try {
        const userId = (req.session as any).userId;
        const dictionaryPath = path.join(__dirname, "../config/data/dictionary.json");
        
        if (!fs.existsSync(dictionaryPath)) {
            return res.render('library', { 
                path: '/library', 
                libraryWords: [], 
                username: (req.session as any).username || 'Zhenis' 
            });
        }

        const rawData = fs.readFileSync(dictionaryPath, 'utf8');
        const allLibraryWords = JSON.parse(rawData);

        db.all("SELECT word FROM words WHERE user_id = ?", [userId], (err, userWords: any[]) => {
            if (err) {
                return res.render('library', { 
                    path: '/library', 
                    libraryWords: allLibraryWords, 
                    username: (req.session as any).username 
                });
            }

            const existingWords = new Set(userWords.map(row => row.word.toLowerCase()));
            const filteredWords = allLibraryWords.filter((libWord: any) => 
                !existingWords.has(libWord.english.toLowerCase())
            );

            res.render('library', { 
                path: '/library',
                libraryWords: filteredWords,
                username: (req.session as any).username || 'Zhenis',
                avatarUrl: (req.session as any).avatarUrl
            });
        });
    } catch (error) {
        res.render('library', { path: '/library', libraryWords: [], username: 'Zhenis' });
    }
});

router.post("/add-word", isAuthenticated, wordController.addWord);
router.post('/add-from-library', isAuthenticated, wordController.addWord);

router.put('/update-word/:id', isAuthenticated, wordController.updateWord);
router.delete('/delete-word/:id', isAuthenticated, wordController.deleteWordPerm);
router.post('/bury-word/:id', isAuthenticated, wordController.buryWordManually); 
router.post('/resurrect-word/:id', isAuthenticated, wordController.resurrectWord);
router.post("/kill/:id", isAuthenticated, wordController.killWordAjax);

router.get("/revive", isAuthenticated, wordController.getRevivePage);
router.post("/live-action", isAuthenticated, wordController.handleLiveAction);
router.post("/test-result", isAuthenticated, wordController.handleTestResult); 
router.post("/training/result", isAuthenticated, wordController.handleTestResult); 

export default router;