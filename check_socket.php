<?php
$link = mysqli_connect("localhost", "ebci_admin", "0815522283", "ebci_job");
if (!$link) {
    echo "Connect failed: %s\n", mysqli_connect_error();
    exit();
}
echo "Host info: " . mysqli_get_host_info($link) . "\n";
// Try to get variables
$res = mysqli_query($link, "SHOW VARIABLES LIKE 'socket'");
$row = mysqli_fetch_assoc($res);
echo "Socket: " . $row['Variable_value'] . "\n";
?>