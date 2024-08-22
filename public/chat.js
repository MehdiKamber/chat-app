const socket = io({ query: { username: "<%= username %>" } });

document.querySelector('#form').addEventListener('submit', function(e) {
    e.preventDefault();
    const input = document.querySelector('#input');
    socket.emit('chatMessage', input.value);
    input.value = '';
});

socket.on('message', function(msg) {
    const li = document.createElement('li');
    li.textContent = msg;
    document.querySelector('#messages').appendChild(li);
});
