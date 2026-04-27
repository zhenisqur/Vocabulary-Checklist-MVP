import { Request, Response } from "express";
import bcrypt from "bcrypt";
import db from "../config/db";
import { wordRepository } from "../repositories/word.repository";
import { normalizeAvatarUrl, addCacheBuster } from "../utils/avatarHelper";
import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_PATH = path.join(process.cwd(), "public", "uploads", "avatars");

const ensureDirectoryExistence = (filePath: string) => {
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureDirectoryExistence(UPLOAD_PATH);
        cb(null, UPLOAD_PATH);
    },
    filename: (req, file, cb) => {
        const userId = (req.session as any).userId || 'guest';
        const ext = path.extname(file.originalname);
        cb(null, `user-${userId}-${Date.now()}${ext}`);
    }
});

export const upload = multer({ storage });

export const uploadAvatar = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.redirect('/profile');
        
        const baseUrl = `/uploads/avatars/${req.file.filename}`;
        const avatarUrl = addCacheBuster(baseUrl, Date.now());
        const userId = (req.session as any).userId;

        db.run("UPDATE users SET avatarUrl = ? WHERE id = ?", [avatarUrl, userId], (err) => {
            if (err) {
                console.error("Ошибка при обновлении аватара:", err);
                return res.status(500).send("Ошибка загрузки");
            }
            (req.session as any).avatarUrl = avatarUrl;
            
            req.session.save((err) => {
                if (err) {
                    console.error("Ошибка сохранения сессии:", err);
                    return res.status(500).send("Ошибка сохранения");
                }
                res.redirect('/profile');
            });
        });
    } catch (error) {
        console.error("Ошибка в uploadAvatar:", error);
        res.status(500).send("Ошибка загрузки");
    }
};

export const getWords = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    db.all("SELECT * FROM words WHERE user_id = ? ORDER BY id DESC", [userId], (err, rows) => {
        if (err) return res.status(500).send("Ошибка словаря");
        res.render("words", { 
            words: rows || [],
            path: "/words" 
        });
    });
};

export const addWord = async (req: Request, res: Response) => {
    const word = req.body.word || req.body.english;
    const meaning = req.body.meaning || req.body.russian;
    const userId = (req.session as any).userId;

    const sql = "INSERT INTO words (word, meaning, status, user_id, death_count) VALUES (?, ?, 'active', ?, 0)";
    
    db.run(sql, [word, meaning, userId], (err) => {
        if (err) {
            if (req.xhr || req.headers.accept?.includes('json')) {
                return res.status(500).json({ success: false });
            }
            return res.status(500).send("Ошибка при добавлении");
        }

        if (req.xhr || req.headers.accept?.includes('json')) {
            return res.json({ success: true });
        }

        res.redirect("/words");
    });
};

export const getActiveWords = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    db.all("SELECT * FROM words WHERE status = 'active' AND user_id = ?", [userId], (err, rows) => {
        if (err) return res.status(500).send("Ошибка империи");
        res.render("active-words", { 
            words: rows || [], 
            activeCount: rows ? rows.length : 0,
            path: "/active"
        });
    });
};

export const getDashboard = (req: Request, res: Response) => {
    const userId = (req.session as any).userId;

    const query = `
        SELECT 
            (SELECT COUNT(*) FROM words WHERE user_id = ?) as total,
            (SELECT COUNT(*) FROM words WHERE status = 'buried' AND user_id = ?) as buried,
            (SELECT COUNT(*) FROM words WHERE status = 'active' AND user_id = ?) as active,
            (SELECT SUM(revive_count) FROM words WHERE user_id = ?) as revived
    `;

    db.get(query, [userId, userId, userId, userId], (err, stats: any) => {
        if (err) {
            console.error("Ошибка статистики:", err);
            return res.status(500).send("Ошибка загрузки дашборда");
        }

        res.render("index", { 
            path: "/",
            stats: {
                total: stats?.total || 0,
                buried: stats?.buried || 0,
                active: stats?.active || 0,
                revived: stats?.revived || 0 
            },
            username: (req.session as any).username,
            avatarUrl: (req.session as any).avatarUrl 
        });
    });
};


export const getGraveyard = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const words = await wordRepository.findBuried(userId);
    res.render("graveyard", { 
        words,
        path: "/graveyard"
    });
};


export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user: any) => {
        if (err || !user) return res.redirect("/auth?error=not_found");
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (isMatch) {
            (req.session as any).userId = Number(user.id);
            (req.session as any).username = user.username;
            // Используем помощник для правильного определения аватара
            (req.session as any).avatarUrl = normalizeAvatarUrl(user.avatarUrl);
            return res.redirect("/");
        }
        res.redirect("/auth?error=wrong_credentials");
    });
};

export const registerUser = async (req: Request, res: Response) => {
    const { email, password, username } = req.body;
    try {
        const password_hash = await bcrypt.hash(password, 10);
        db.run("INSERT INTO users (email, password_hash, username, avatarUrl) VALUES (?, ?, ?, ?)",
            [email, password_hash, username, null], (err) => {
                if (err) return res.redirect("/register?error=exists");
                res.redirect("/auth?registered=1");
            });
    } catch (err) { res.status(500).send("Ошибка"); }
};

export const updateProfile = (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const { username, email } = req.body;
    db.run("UPDATE users SET username = ?, email = ? WHERE id = ?",
        [username, email, userId], () => {
            (req.session as any).username = username;
            res.redirect("/dashboard");
        });
};
export const handleLiveAction = async (req: Request, res: Response) => {
    try {
        const { wordId, action } = req.body;
        const userId = (req.session as any).userId;

        if (action === 'forgot') {
            await wordRepository.buryWord(wordId);
            
            const actualBuriedCount = await wordRepository.countBuried(userId);
            
            (req.session as any).currentStep = actualBuriedCount;

            if (actualBuriedCount >= 5) {
                (req.session as any).inEmergencyMode = true;
            }
        } else if (action === 'remembered') {
            if ((req.session as any).inEmergencyMode) {
                await new Promise((resolve, reject) => {
                    const sql = "UPDATE words SET status = 'active', revive_count = revive_count + 1 WHERE id = ? AND user_id = ?";
                    db.run(sql, [wordId, userId], (err) => {
                        if (err) reject(err);
                        else resolve(true);
                    });
                });
            }
        }

        const finalBuriedCount = await wordRepository.countBuried(userId);
        
        if (finalBuriedCount === 0) {
            (req.session as any).inEmergencyMode = false;
            (req.session as any).currentStep = 0;
            return res.json({ showVictory: true });
        }

        res.json({ 
            success: true, 
            currentStep: (req.session as any).currentStep,
            emergencyTriggered: (req.session as any).inEmergencyMode 
        });
    } catch (error) {
        console.error("Ошибка в handleLiveAction:", error);
        res.status(500).json({ error: "Ошибка действия" });
    }
};

export const getRevivePage = async (req: Request, res: Response) => {
    try {
        const userId = (req.session as any).userId;
        const buriedCount = await wordRepository.countBuried(userId);
        
        if (!(req.session as any).currentStep) {
            (req.session as any).currentStep = 1;
        }

        const commonData = {
            path: "/revive",
            buriedCount: buriedCount,
            currentStep: (req.session as any).currentStep,
            user: { 
                name: (req.session as any).username, 
                avatarUrl: (req.session as any).avatarUrl 
            }
        };

        if (buriedCount >= 5 || ((req.session as any).inEmergencyMode && buriedCount > 0)) {
            (req.session as any).inEmergencyMode = true;
            
            const word = await wordRepository.getRandomBuried(userId);
            if (!word) {
                (req.session as any).inEmergencyMode = false;
                (req.session as any).currentStep = 1;
                return res.redirect("/revive");
            }
            
            return res.render("revive", { 
                ...commonData,
                currentWord: word,
                theme: 'emergency' 
            });
        }

        (req.session as any).inEmergencyMode = false;
        const word = await wordRepository.getRandomActive(userId);
        
        if (!word) return res.redirect("/");

        return res.render("revive", {
            ...commonData,
            currentWord: word,
            theme: 'active-mode'
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Ошибка сервера");
    }
};

export const deleteWordPerm = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const wordId = req.params.id;

    db.run("DELETE FROM words WHERE id = ? AND user_id = ?", [wordId, userId], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
};

export const updateWord = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const { id } = req.params;
    const { word, meaning } = req.body;

    db.run(
        "UPDATE words SET word = ?, meaning = ? WHERE id = ? AND user_id = ?",
        [word, meaning, id, userId],
        (err) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true });
        }
    );
};

export const buryWordManually = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const { id } = req.params;

    db.run(
        "UPDATE words SET status = 'buried', death_count = death_count + 1 WHERE id = ? AND user_id = ?",
        [id, userId],
        (err) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true });
        }
    );
};

export const killWordAjax = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const wordId = req.params.id;

    db.run(
        "UPDATE words SET status = 'buried', death_count = death_count + 1 WHERE id = ? AND user_id = ?", 
        [wordId, userId], 
        (err) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true });
        }
    );
};

export const resurrectWord = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const wordId = req.params.id;

    db.run(
        "UPDATE words SET status = 'active', revive_count = revive_count + 1 WHERE id = ? AND user_id = ?", 
        [wordId, userId], 
        (err) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true });
        }
    );
};

export const getProfilePage = (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    
    db.get("SELECT id, username, email, avatarUrl FROM users WHERE id = ?", [userId], (err, user: any) => {
        if (err || !user) return res.status(500).send("Ошибка загрузки профиля");
        
        db.get("SELECT COUNT(*) as count FROM words WHERE user_id = ? AND status = 'active'", [userId], (err2, result: any) => {
            const activeCount = result?.count || 0;
            
            const wordsPerLevel = 50; 
            const level = Math.min(Math.floor(activeCount / wordsPerLevel) + 1, 20);
            const wordsNeeded = Math.max(level * wordsPerLevel - activeCount, 0);
            
            res.render("profile", {
                user: { ...user, name: user.username },
                level: level,
                activeCount: activeCount,
                wordsNeeded: wordsNeeded,
                path: "/profile"
            });
        });
    });
};
export const handleTestResult = async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    const { wordId, isCorrect } = req.body;

    try {
        if (isCorrect) {
            return res.json({ 
                success: true, 
                currentStep: (req.session as any).currentStep || 0 
            });
        } else {
            db.run(
                "UPDATE words SET status = 'buried', death_count = death_count + 1 WHERE id = ? AND user_id = ?",
                [wordId, userId],
                async (err) => {
                    if (err) {
                        console.error("Ошибка при обновлении статуса слова:", err);
                        return res.status(500).json({ success: false });
                    }

                    db.get("SELECT COUNT(*) as count FROM words WHERE user_id = ? AND status = 'buried'", [userId], (errCount, row: any) => {
                        const buriedCount = row?.count || 0;
                        
                        (req.session as any).currentStep = buriedCount;

                        if (buriedCount >= 5) {
                            (req.session as any).inEmergencyMode = true;
                        }

                        req.session.save((errSave) => {
                            if (errSave) {
                                console.error("Ошибка при сохранении сессии:", errSave);
                                return res.status(500).json({ success: false });
                            }

                            res.json({ 
                                success: true, 
                                currentStep: buriedCount,
                                emergencyTriggered: (req.session as any).inEmergencyMode 
                            });
                        });
                    });
                }
            );
        }
    } catch (error) {
        console.error("Ошибка в handleTestResult:", error);
        res.status(500).json({ success: false, error: "Ошибка БД" });
    }
};