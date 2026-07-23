document.getElementById("send-btn").addEventListener("click", sendMessage);

document.getElementById("message").addEventListener("keypress", function(e){
    if(e.key==="Enter"){
        sendMessage();
    }
});

async function sendMessage(){

    const input=document.getElementById("message");
    const chatBox=document.getElementById("chat-box");

    const message=input.value.trim();

    if(message==="") return;

    chatBox.innerHTML+=`
        <div class="user-message">
            <span>${message}</span>
        </div>
    `;

    input.value="";

    chatBox.innerHTML+=`
        <div class="bot-message" id="loading">
            <span>Thinking...</span>
        </div>
    `;

    chatBox.scrollTop=chatBox.scrollHeight;

    const response=await fetch("/chat",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            message:message
        })
    });

    const data=await response.json();

    document.getElementById("loading").remove();

    chatBox.innerHTML+=`
        <div class="bot-message">
            <span>${data.response}</span>
        </div>
    `;

    chatBox.scrollTop=chatBox.scrollHeight;
}