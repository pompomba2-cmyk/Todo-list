// Cloudflare Pages Function for GET, POST, PUT /api/notes

export async function onRequestGet(context) {
    const db = context.env.DB;
    try {
        let note = await db.prepare("SELECT content FROM notes WHERE id = 'supervisor_notes'").first();
        
        // If not found (for some reason), create default
        if (!note) {
            await db.prepare("INSERT INTO notes (id, content) VALUES ('supervisor_notes', '')").run();
            note = { content: '' };
        }
        
        return new Response(JSON.stringify(note), {
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
    return onRequestPut(context);
}

export async function onRequestPut(context) {
    const db = context.env.DB;
    try {
        const body = await context.request.json();
        const content = body.content || '';
        
        await db.prepare(
            "INSERT INTO notes (id, content) VALUES ('supervisor_notes', ?) ON CONFLICT(id) DO UPDATE SET content = excluded.content"
        ).bind(content).run();
        
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
