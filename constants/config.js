const corsOptions={
    origin:[process.env.CLIENT_URL,
            "http://localhost:5173",
            "http://localhost:4173",
            "https://chat-app-frontend-ochre-seven.vercel.app"
        ],
    methods:["GET","POST","PUT","DELETE"],        
    credentials:true
}

export {corsOptions}