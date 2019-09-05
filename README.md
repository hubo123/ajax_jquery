# ajax_jquery Demo
基于jquery封装的ajax类库 
<html>
<script src="http://cdn.www.ebd.bush.eyebuy.direct/static/js/jquery.1552876916.js"></script>

<script src="core.ajaxauto.js"></script>

<form id="forms" action="http://localhost/index.php">
    <input name="name">
    <input name="id">
    <button id="submit" type="submit">test</button>
</form>

<script>
    $("#forms").submit(function () {
        $(this).ajaxAuto({
            'data':{'name':"name","id":111},
            'url':'http://localhost/index.php',
            'success': function(respon){
               console.log(respon.status)
            }
        });
        return false;
    })
</script>

</html>

<?php
    echo json_encode(['status'=>200]);
    exit();

