import express from "express";
import pkg from "pg";
const {Pool}=pkg;
import fetch from "node-fetch";
import axios from "axios";
import bodyParser from "body-parser";

const apikey="AIzaSyDNaYpwqS-VswKj1WqkE-oBGVYEf2Uzo8o";
const app=express();
const port=3000;

const pool=new Pool({
  user:"postgres",
  port:5432,
  password:"#Palak25",
  host:"localhost",
  database:"books"
});

//fetch books covers from the google books api
async function fetchBookCover(title){
  try{
    const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(
      title)}&key=${apikey}`;
      const response = await fetch(url);
      const data = await response.json();
      console.log("Google Books API Response:", data); // Debug log
      return data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail || "";
  }
  catch(err){
    console.error("error fetching books cover",err);
    return 'https://via.placeholder.com/150?text=Error';
  }
  };

//Middleware setup
app.use(express.static('public'));
app.set("view engine", "ejs");
app.use(express.urlencoded({extended:true}));
app.use(express.json());

//Home route
app.get("/",async(req,res)=>{
    try{
        const result=await pool.query("SELECT * FROM cards ORDER BY id DESC");
        res.render("index",{cards:result.rows});
    }
    catch(err){
console.error(err);
res.status(500).send("Error fetching data");
    }
});

//post route to add a new card
app.post("/add-card",async (req,res)=>{
 const {title,description}=req.body;
 try{
    const cover_url = await fetchBookCover(title);
    await pool.query("INSERT INTO cards (title,description,cover_url) VALUES ($1,$2,$3)",[title,description,cover_url]);
    res.redirect("/");
 }
 catch(err){
    console.error(err);
    res.status(500).send("Error adding card");
 }
});

//fetch book description page when clicked on the card
app.get("/book/:id",(req,res)=>{
  const bookid=req.params.id;
  pool.query("SELECT * FROM cards WHERE id=$1",[bookid],(err,result)=>{
    if(err){
      return res.status(500).send("Error fetching book");
    }
   const book=result.rows[0];
   if(!book){
    return res.status(404).send("Book not found");
   }
   res.render("book-detail",{book});
  });
});

//edit description post request

app.post("/updated-description/:id",async(req,res)=>{
const bookID=parseInt(req.params.id,10);
const {description}=req.body;
console.log("Received book ID:", bookID);  // Debugging log
  console.log("Received description:", description);  // Debugging log
try{
  const result=await pool.query("UPDATE cards SET description = $1 WHERE id = $2", [description, bookID]);
  console.log("Update result:", result); 
  res.status(200).send("Description updated successfully");
}
catch(err){
  console.error("Error updating description:", err);
  res.status(500).send("Error updating description");
}
})

//fetch the prev and next book based on the current book id
app.get("/book/navigation/:id",async (req,res)=>{
  const bookID=parseInt(req.params.id,10);
  try{
    //fetch the prev book(if it exists)
    const prevResult=await pool.query("SELECT id FROM cards WHERE id < $1 ORDER BY id DESC LIMIT 1",[bookID]);
    const prevBookID = prevResult.rows.length > 0 ? prevResult.rows[0].id : null;

    //fetch the next book(if it exists)
    const nextResult = await pool.query("SELECT id FROM cards WHERE id > $1 ORDER BY id ASC LIMIT 1", [bookID]);
    const nextBookID = nextResult.rows.length > 0 ? nextResult.rows[0].id : null;

    res.json({ prevBookID, nextBookID });
  }
  catch(err){
    console.error("Error fetching previous/next book:", err);
    res.status(500).send("Error fetching navigation data");
  }
});

//start the server
app.listen(port,()=>{
    console.log("Listening to port 3000");
});