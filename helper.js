import { client } from './index.js';
import bcrypt from 'bcrypt';

export async function getHashedPassword(password){
    const salt = await bcrypt.genSalt(10);
    const hashedPw = await bcrypt.hash(password, salt);
    return hashedPw;
}
export async function getUsers(data){
    return await client.db("loginpage").collection("users").findOne(data);
}
export async function postUser(user){
    return await client.db("loginpage").collection("users").insertOne(user);
}

export async function updateUser(email, data){
    return await client.db("loginpage").collection("users").updateOne({email: email}, {$set: data});
}
export async function updateUserPassword(email, data){
    return await client.db("loginpage").collection("users").updateOne({email: email}, {$set: data}, {new: true});
}