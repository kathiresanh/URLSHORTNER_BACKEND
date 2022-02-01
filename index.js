const express = require('express')
const app = express()
app.use(express.json())
const cors = require('cors');
const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


require('dotenv').config({ path: './secure.env' })
const secret = process.env.SECRET;
const URL =process.env.URL;
let options = {
    origin:"*"
}

var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.USER_NAME,
    pass: process.env.PASS_WORD
  }
});



let authenticate = function(req,res,next){
   
    if(req.headers.authorization){
       try {
           let result = jwt.verify(req.headers.authorization,secret)
           if(result){
               next()
           }else{
               res.status(401).json({messae:"token invalid"})
           }
         
       } catch (error) {
           res.status(401).json({message:"token invalid"})
      
       }
    }else{
        res.status(401).json({message:"not authorized"})
    }
}


app.use(cors(options))

app.post("/register",async function(req,res){
try {
    let connection = await mongoClient.connect(URL);
    let db = connection.db("facebook");
    let user = await db.collection("users").findOne({email:req.body.email})
    if(user==null){
        let salt = await bcrypt.genSalt(10);
        let hash =await bcrypt.hash(req.body.password,salt);
        req.body.status=0; 
        req.body.token=(Math.random()*100000) 
        req.body.password=hash;
        let user = await db.collection("users").insertOne(req.body)
        
        connection.close();
        res.json({message:"useradded"})
    
        // send activation link to customer
    
        var mailOptions = {
            from: process.env.USER_NAME,
            to: req.body.email,
            subject: 'welcome to ionix',
            text: `https://urlshortnerbackend1.herokuapp.com/activation/${req.body.email}/${req.body.token}`
          };
          
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
    }else{
        res.status(401).json({message:"user already exists"})
    }
  
} catch (error) {
    console.log(error)
}
})

app.post("/login",async function(req,res){
    try {
        let connection = await mongoClient.connect(URL);
        let db = connection.db("facebook");
        let user = await db.collection("users").findOne({email:req.body.email})
    
        if(user){
          if(user.status==1){
            let passwordresult = await bcrypt.compare(req.body.password,user.password)
            if(passwordresult){
                let token = jwt.sign({userid:user._id},secret,{expiresIn: "1h"})
                res.json({tokens:token})
              
            }else{
                res.status(401).json({message:"user id or password"})
            }
          }else{
              res.status(401).json({message:"user mail not verified"})
          }
        }else{
            res.status(401).json({message:"user id or password"})

        }
        await connection.close();
    } catch (error) {
        console.log(error)
    }
})

app.get("/dashboard",authenticate,function(req,res){
    res.json({total:20})
})


app.get("/activation/:email/:token",async function(req,res){
   
    try {
        let connection = await mongoClient.connect(URL);
        let db = connection.db("facebook");
        let user = await db.collection("users").findOne({email:req.params.email})
        
        if(user){
            if (user.token==req.params.token){
                req.body.status =1;
         await db.collection("users").findOneAndUpdate({email:req.params.email},{$set:req.body})
         await connection.close();
         res.json({message:"activated"})
            }else{
                res.json({message:"invalid activation link"})
            }
        }else{
            res.status(401).json({message:"no user found"})

        }
    } catch (error) {
        console.log(error)
    }
})

app.post("/reset",async function(req,res){
   try {
    let connection = await mongoClient.connect(URL);
    let db = connection.db("facebook");
    let user = await db.collection("users").findOne({email:req.body.email})

    if(user){
        req.body.secret = Math.floor((Math.random()*10000))
        await db.collection("users").findOneAndUpdate({email:req.body.email},{$set:req.body})
        await connection.close();
        

    // send password reset code to customer

    var mailOptions = {
        from: 'philosophykathir@gmail.com',
        to: req.body.email,
        subject: 'PASSWORD RESET CODE',
        text: `SECRET CODE :${req.body.secret}`
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
        res.json({message:"secret code send sucessfully"})


    }else{
        res.status(401).json({message:"no such users present"})
    }
    
     } catch (error) {
       console.log(error)
   }
})


// password reset in database 


app.post("/passwordchange",async function(req,res){
    try {
        let connection = await mongoClient.connect(URL);
        let db = connection.db("facebook");
        let salt = await bcrypt.genSalt(10);
        let hash =await bcrypt.hash(req.body.password,salt);
        
        let user = await db.collection("users").findOne({email:req.body.email})
        if(user){
            if(user.secret==req.body.secret){
                req.body.password=hash;
            await db.collection("users").findOneAndUpdate({email:req.body.email},{$set:req.body})
            await connection.close();
            res.json({message:"password changed sucessfully"})
            }else{
                res.status(401).json({message:"invalid secret code"})
            }
        }else{
            res.status(401).json({message:"no user found"})
        }
        
    } catch (error) {
        console.log(error)
    }
})


// url shortner request


app.post("/urlshortner",async function(req,res){
    try {
        let connection = await mongoClient.connect(URL);
        let db = connection.db("facebook");
        req.body.secret = Math.floor((Math.random()*10000))
        let user = await db.collection("URL").insertOne(req.body)
        await connection.close();
        res.json({message:`https://urlshortnerbackend1.herokuapp.com/ly/${req.body.secret}`})
    }catch(error){
        res.json({message:"no access"})
    }
    
})

app.get("/ly/:secret",async function(req,res){
    try {
        let connection = await mongoClient.connect(URL);
    let db = connection.db("facebook");
    let value = parseInt(req.params.secret)
    console.log(value)
    let user = await db.collection("URL").findOne({secret:value})
    await connection.close();
    res.redirect(user.url);
    } catch (error) {
        res.json(error)
    }
})

app.listen(process.env.PORT || 3001)

