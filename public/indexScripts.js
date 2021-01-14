$(function(){

    function createRoomsList(roomsList){
        const roomListContainer = document.getElementById('room-list-container');
        roomListContainer.innerHTML = "";
        const url = "/room";
        roomsList.map((room)=>{
            console.log(`HISTORY FOR ${room.roomName}:`);
            console.log('-------------------');
            if(room.history){
                console.log(JSON.stringify(room.history, null, 2));
            } else {
                console.log('NONE');                
            }
            console.log('-------------------');
            if(room.securitySetting != 2){
                    //Create the div that holds everything.
                const resultDiv = document.createElement('div');
                resultDiv.setAttribute('class', 'room-result');
                    //Create the div that holds the thumbnail
                const thumbDiv = document.createElement('div');
                thumbDiv.setAttribute('class', 'room-thumbnail-div');
                resultDiv.append(thumbDiv);
                    //Create the thumbnail
                const thumbnail = document.createElement('img');
                thumbnail.setAttribute('class', 'room-thumbnail');
                thumbnail.setAttribute('src', room.thumbnail);
                    //Add a tag
                const thumbLink = document.createElement('a');
                thumbLink.setAttribute('href', url+"/"+room.roomID);                    
                    //Add thumbnail to the a tag containing it                                        
                thumbLink.appendChild(thumbnail);
                    //Add a tag to thumbdiv
                thumbDiv.append(thumbLink);

                    //Create room name
                const roomName = document.createElement('span');
                roomName.setAttribute('class', 'room-name');
                const nameText = document.createTextNode("Room: "+room.roomName);
                roomName.appendChild(nameText);
                    //Add roomName to result                                

                    //Create description
                const description = document.createElement('span');
                description.setAttribute('class', 'room-description');
                const elipses = room.roomDescription.length > 160 ? ' ...' : '';
                const shortenedDescription = "Description:\n"+room.roomDescription.substring(0, 160) + elipses; 
                const descriptionText = document.createTextNode(shortenedDescription);
                description.appendChild(descriptionText);

                    //Add name and desc to resultDiv
                const infoContainer = document.createElement('div');
                infoContainer.setAttribute('class', 'name-description-container');
                infoContainer.appendChild(roomName);
                infoContainer.appendChild(description);                    
                    //Add description to result
                resultDiv.append(infoContainer);

                
                    //Create the user count
                const userCount = document.createElement('span');
                userCount.setAttribute('class', 'room-user-count');
                const userCountText = document.createTextNode("Users: "+room.users.length);
                userCount.appendChild(userCountText);
                    //Add the count to the result
                resultDiv.append(userCount);

                    //NSFW Status
                const nsfwStatus = document.createElement('span');
                const status = room.nsfw ?
                    'nsfw-status fas fa-thumbs-up nsfw-green nsfw-status' :
                    'nsfw-status fas fa-exclamation-triangle nsfw-yellow';
                nsfwStatus.className = status;
                    //Add nsfw status to result
                // resultDiv.append(nsfwStatus);

                    //Security Status
                const securityStatus = document.createElement('span');
                const security = room.securitySetting == 0 ?
                    'security-status fas fa-lock-open' :
                    'security-status fas fa-lock';
                securityStatus.className = security;
                    //Add security status to result
                // resultDiv.append(securityStatus);

                const lockNsfwContainer = document.createElement('div');
                lockNsfwContainer.setAttribute('class', 'lock-nsfw-container');

                lockNsfwContainer.append(securityStatus);
                lockNsfwContainer.append(nsfwStatus);
                resultDiv.append(lockNsfwContainer);

                
                // console.log(JSON.stringify(roomListContainer, null, 2));
                    //Finally add it all to the list.
                roomListContainer.append(resultDiv);
            }//if securitysetting != 2
        });//map
        // console.log(JSON.stringify(roomListContainer, null, 2));
    }//createRoomsList()

    function checkServerForRooms(){
        $.ajax({
            url: '/get-rooms-list',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({userID: localStorage.getItem('userID')}, null, 2),
            success: res=>{
                //use res.rooms
                // console.log(`ROOMS ARE: ${JSON.stringify(res.rooms, null, 2)}`);
                createRoomsList(res.rooms);
            }
        });
    }

    checkServerForRooms();

    // createRoomsList(rooms);

    $('#refresh-button').click(e=>{
        $.ajax({
            url: '/get-rooms-list',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({userID: localStorage.getItem('userID')}, null, 2),
            success: res=>{
                //use res.rooms
                // console.log(`ROOMS ARE: ${JSON.stringify(res.rooms, null, 2)}`);
                    //Fill the container div with divs that have
                    //display mode of grid, with their contents
                    //aligned to inner grids. The results will be
                    //flex items, because the container div is a
                    //flexbox
                    createRoomsList(res.rooms);
            }
        });
    });

});