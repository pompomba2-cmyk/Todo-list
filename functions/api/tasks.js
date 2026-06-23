// Cloudflare Pages Function for GET, POST, PUT, DELETE /api/tasks

export async function onRequestGet(context) {
    const db = context.env.DB;
    try {
        const { results } = await db.prepare("SELECT * FROM tasks").all();
        return new Response(JSON.stringify(results), {
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" 
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestPost(context) {
    const db = context.env.DB;
    try {
        const body = await context.request.json();
        const { id, title, desc, assignee, status, created, deadline } = body;
        
        await db.prepare(
            "INSERT INTO tasks (id, title, desc, assignee, status, created, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, title, desc || null, assignee, status, created, deadline).run();
        
        return new Response(JSON.stringify({ success: true, id }), {
            status: 201,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestPut(context) {
    const db = context.env.DB;
    try {
        const body = await context.request.json();
        const { id, title, desc, assignee, status, deadline } = body;
        
        await db.prepare(
            "UPDATE tasks SET title = ?, desc = ?, assignee = ?, status = ?, deadline = ? WHERE id = ?"
        ).bind(title, desc || null, assignee, status, deadline, id).run();
        
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestDelete(context) {
    const db = context.env.DB;
    try {
        const url = new URL(context.request.url);
        const id = url.searchParams.get("id");
        
        if (!id) {
            return new Response(JSON.stringify({ error: "Missing task ID" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        await db.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
        
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
