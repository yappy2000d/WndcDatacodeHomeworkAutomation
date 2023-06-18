let email = '<your-email>';
let password = '<your-password>';
let keyword = '<your-course-name>';
let mode = 'cpp'  // [py | cpp]

function myFunction() {
  const root = DriveApp.getFoldersByName("WndcDatacodeHomeworkAutomation");
  if(root.hasNext()) {
    const rootFolder = root.next();

    // 取得 `驗證 token` 以及 `會話 cookies`
    let response = UrlFetchApp.fetch('https://datacode.wndc.nkust.edu.tw/Identity/Account/Login');
    let $ = Cheerio.load(response.getContentText());
    let token = $('input[name="__RequestVerificationToken"]').val();
    let cookies = response.getAllHeaders()['Set-Cookie'].join(';');

    // 登入後取得驗證
    response = UrlFetchApp.fetch('https://datacode.wndc.nkust.edu.tw/Identity/Account/Login', options = {
      'headers': {'Cookie': cookies},
      'method': 'post',
      'payload' : {
        'Input.Email': email,
        'Input.Password': password,
        '__RequestVerificationToken': token
      },
      followRedirects: false,   // 關閉跳轉（不然cookies會跟著不見）
    });
    cookies = response.getAllHeaders()['Set-Cookie'].join(';');
  
    // 進入題目區
    response = UrlFetchApp.fetch('https://datacode.wndc.nkust.edu.tw/Exercise', options={
      'headers': {'Cookie': cookies}
      });
    $ = Cheerio.load(response.getContentText());
    console.log($('a[title="Manage"]').text());

    var myList = [];
    var $rows = $("tbody tr").each(function(index) {
      cells = $(this).find('td');
      if(cells.first().text().includes(keyword)) {
        myList.push(cells.find('a:last').attr('href').split('/').slice(-1)[0]);
      }
    });
    console.log("題號：", myList);

    myList.forEach(function(crsno, index) {
      // 若曾經提交則跳過
      if(rootFolder.getFilesByName(`${crsno}.zip`).hasNext()) {
        return;  // this is equivalent of 'continue' for jQuery loop
      }
      // 設定內容
      if(mode == 'cpp') {
        var context = `#include <iostream>
#include <fstream>

int main() {
    // Create and open a text file
    std::ifstream myfile("/home/datacode/Files/${crsno}/Result.txt");
    std::string myline;
    if ( myfile.is_open() ) { // always check whether the file is open
        while ( !myfile.eof() ) { // equivalent to myfile.good()
            std::getline (myfile, myline);
            std::cout << myline << '\\n';
        }
    }   
    myfile.close();
}`
      }
      else {
        var context = `print('open(/home/datacode/Files/${crsno}/Result.txt').read())`
      }

      // 設定檔案
      const files = rootFolder.getFilesByName(`HW.${mode}`);
      if(files.hasNext()) {
        var file = files.next();
        file.setContent(context);
      }
      else {
        var file = rootFolder.createFile(`HW.${mode}`, context);
      }
      const zipFile = rootFolder.createFile(Utilities.zip([file], `${crsno}.zip`));

      // 獲得 `驗證token`
      let response = UrlFetchApp.fetch('https://datacode.wndc.nkust.edu.tw/Exercise/Upload/' + crsno);
      let $ = Cheerio.load(response.getContentText());
      let token = $('input[name="__RequestVerificationToken"]').val();

      let option = {
        'headers': {'Cookie': cookies},
        'method' : 'post',
        'payload' : {
          'file': zipFile.getBlob(),
          '__RequestVerificationToken': token,
        },
        muteHttpExceptions: true,
        followRedirects: false,
      };

      // 進行上傳
      response = UrlFetchApp.fetch('https://datacode.wndc.nkust.edu.tw/Exercise/Upload/' + crsno + '?datatype=zip', option);

      // 驗證答案
      response = UrlFetchApp.fetch('https://datacode.wndc.nkust.edu.tw/Exercise/Verify/' + crsno , {
        'headers': {
          'Cookie': cookies
        },
      });

      // 顯示結果
      $ = Cheerio.load(response.getContentText());
      console.log(crsno, ': ', $('p:contains("驗證結果(Your result)")').next().text().trim());
    })
  }
  else {
    console.log('請先創建 WndcDatacodeHomeworkAutomation 資料夾');
  }
}
