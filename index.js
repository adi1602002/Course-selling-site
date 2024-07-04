const express = require("express");
const app = express();
const fs = require("fs")
const jwt = require("jsonwebtoken")
const bodyParser = require("body-parser")
const cors = require("cors")

app.use(cors())

app.use(express.json())
app.use(bodyParser.json())

const secret = "superMySecret"

const generateJwt = (user) => {
    const payload = {username : user}
    return jwt.sign(payload,secret,{ expiresIn: "1h" })
}

const adminAuthJwt = (req,res,next) => {
    const authHeader = req.headers.authorization
    if(authHeader) {
        const token = authHeader.split(" ")[1];
        jwt.verify(token,secret,(err,user) => {
            if(err) {
                return res.sendStatus(403)
            }

            req.user = user;
            next();
        })
    }else {
        res.sendStatus(404)
    }
    
}
const userAuthJwt = (req,res,next) => {
    const authHeader = req.headers.authorization
    if(authHeader) {
        const token = authHeader.split(" ")[1];
        jwt.verify(token,secret,(err,user) => {
            if(err) return res.sendStatus(403)

            req.user = user;
            next();
        })
    }else {
        res.sendStatus(404)
    }
    
}

app.get("/admin/me",adminAuthJwt,(req,res) => {
    res.json({
        "username" : req.user.username
    })
})

app.post("/admin/signup",(req,res) => {
    const admin = req.body;
    fs.readFile("admin.json","utf-8",(err,data) => {
        if(err) throw err;
        const ADMINS = JSON.parse(data)
        const existingAdmin = ADMINS.find(a => a.username === admin.username) 
        if(existingAdmin) {
           res.status(401).json({message:"Account already exists"})
        }else{
           ADMINS.push(admin)
           const adminToken = generateJwt(admin.username);
           console.log(adminToken)
           fs.writeFile('admin.json', JSON.stringify(ADMINS), (err) => {
            if(err) throw err;
            res.status(200).json({message:"The account is created successfully",token : adminToken})
        })
        }
    })
})

app.post("/admin/login",(req,res) => {
    res.status(200).send("Admin has been logged in")
    const {username,password} = req.headers    
    fs.readFile("admin.json","utf-8",(err,data) => {
        if(err) throw data;
        const ADMINS = JSON.parse(data)
        const admin = ADMINS.find(a => a.username === username && a.password === password)
        if(admin) {
            const token = generateJwt(admin.username)
            console.log(token)
        }
    })
})

app.post("/admin/courses",adminAuthJwt,(req,res) => {
    const course = req.body;
    fs.readFile("courses.json","utf-8",(err,data) => {
        if(err) throw err;
        const COURSES = JSON.parse(data)
        course.courseId = COURSES.length + 1
        COURSES.push(course)
        fs.writeFile("courses.json",JSON.stringify(COURSES),(err) => {
            if(err) throw err;
            res.status(200).json({message:"Course is successfully added"})
        })
    })
})

app.put("/admin/courses/:courseId",adminAuthJwt,(req,res) => {
    const courseId = parseInt(req.params.courseId);
    
    fs.readFile("courses.json","utf-8",(err,data) => {
        if(err) throw err;
        const COURSES = JSON.parse(data);
        const course = COURSES.find(c => c.courseId === courseId)
        if(course) {
            Object.assign(course,req.body)
        }else {
            res.status(401).json({error:"The course is not available"})
        }
        fs.writeFile("courses.json",JSON.stringify(COURSES),(err) => {
            if(err) throw err;
            res.status(200).json({message: "The course is changed successfully"})
        })
    })
    
})

app.get("/admin/courses",adminAuthJwt,(req,res) => {
    fs.readFile("courses.json","utf-8",(err,data) => {
        if(err) throw err;
        const COURSES = JSON.parse(data)
        res.status(200).json(COURSES)    
    })
})

app.post("/users/signup",(req,res) => {
    const user = req.body;
    fs.readFile("user.json","utf-8",(err,data) => {
        if(err) throw err;
        const USERS = JSON.parse(data)
        const existingUser = USERS.find(u => u.username === user.username)
        if(existingUser) {
            res.status(401).json({message:"The username already exists"})
        }else {
            USERS.push(user)
        }
        fs.writeFile("user.json",JSON.stringify(USERS),(err) => {
            if(err) throw err;
            const token = generateJwt(user)
            res.status(200).json({ message : "the account is made ", token : token})
        })
    })
})

app.post("/users/login",(req,res) => {
    const {username,password} = req.headers
    fs.readFile("user.json","utf-8",(err,data) => {
        if(err) throw data;
        const USERS = JSON.parse(data)
        const user = USERS.find(u => u.username === username && u.password === password)
        if(user) {
            const token = generateJwt(user.username)
            res.status(200).json({ message: "user has logged in", token : token})
        }else [
            res.sendStatus(404)
        ]
    })
})

app.get("/users/courses",userAuthJwt,(req,res) => {
    fs.readFile("courses.json","utf-8",(err,data) => {
        if(err) throw err;
        const COURSES = JSON.parse(data)
        const publishedCourses = COURSES.filter(c => c.published === true)
        res.status(200).json(publishedCourses)  
    })
})

app.post("/users/courses/:courseId",userAuthJwt, (req,res) => {
    const purchasedCourseId = parseInt(req.params.courseId)
    fs.readFile("user.json","utf-8",(err,data) => {
        if(err) throw err;
        const USERS = JSON.parse(data);
        const purchasingUser = USERS.find(u => u.username === req.user.username);
        purchasingUser.myCourses = [];
        fs.readFile("courses.json","utf-8",(err,data) => {
            if(err) throw err;
            const COURSES = JSON.parse(data)
            const purchasedCourse = COURSES.find(c => c.courseId === purchasedCourseId)
            purchasingUser.myCourses.push(purchasedCourse);
            fs.writeFile("user.json",JSON.stringify(USERS),(err) => {
                if(err) throw err;
                res.status(200).json({message:"course is created",user : purchasingUser})
            });
        })
    })
})

app.get("/users/purchasedCourses",userAuthJwt,(req,res) => {
    const username = req.user.username;
    fs.readFile("user.json","utf-8",(err,data) => {
        if(err) throw err;
        const USERS = JSON.parse(data)
        const meUser = USERS.find(u => u.username === username);
        res.status(200).json(meUser.myCourses)
    })
})


app.listen(3000,() => {
    console.log("running .....")
})

