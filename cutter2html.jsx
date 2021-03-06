/**
 * Created by Liangxiao on 17/7/6.
 */

//@include "lib/json2.min.js"
//@target photoshop
app.preferences.rulerUnits = Units.PIXELS;
app.bringToFront();

/* 生成指定位数的序列号（填充0） */
function zeroSuppress(num, digit) {
    var tmp = num.toString();
    while (tmp.length < digit) {
        tmp = "0" + tmp;
    }
    return tmp;
}

/* 存储PNG */
function savePNG(path, name, crArr) {
    var x1 = UnitValue(crArr[0]).as('px'),
        y1 = UnitValue(crArr[1]).as('px'),
        x2 = UnitValue(crArr[2]).as('px'),
        y2 = UnitValue(crArr[3]).as('px');
    var selectReg = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    app.activeDocument.selection.select(selectReg);
    app.activeDocument.selection.copy(true);
    app.activeDocument.selection.deselect();

    var width = x2 - x1;
    var height = y2 - y1;
    var resolution = 72;
    var docName = "切图用临时文档";
    var mode = NewDocumentMode.RGB;
    var initialFill = DocumentFill.TRANSPARENT;
    preferences.rulerUnits = Units.PIXELS;
    var newDocument = documents.add(width, height, resolution, docName, mode, initialFill);
    newDocument.paste();

    var exp = new ExportOptionsSaveForWeb();
    exp.format = SaveDocumentType.PNG;
    exp.interlaced = false;
    exp.PNG8 = false;

    var folderImg = new Folder(path);
    if (!folderImg.exists) { folderImg.create(); }
    var fileObj = new File(folderImg.fsName + '/' + name + ".png");
    newDocument.exportDocument(fileObj, ExportType.SAVEFORWEB, exp);
    newDocument.close(SaveOptions.DONOTSAVECHANGES);
}

/* 在工作文档中处理所有复制来的图层/组，如果是图层组就先合并，然后裁切并输出 */
function processing(exFolder) {
    var rectArr = []; // 组件名，定位和宽高
    var layers = app.activeDocument.layers;
    var len = layers.length;
    var i, j, fileIndex = 0;
    var x1, x2, y1, y2, width, height, name, layerName;
    var tmp, cmp, boundsArr;
    var psdName = app.activeDocument.name;
    psdName = psdName.replace(".psd", "");
    for (i = 0; i < len; i++) {
        if (!layers[i].visible) { // 跳过隐藏图层
            continue;
        }
        boundsArr = layers[i].bounds;
        cmp = app.activeDocument.layerComps.add("快照", "", true, true, true); // 使用图层复合做备份
        x1 = UnitValue(boundsArr[0]).as('px');
        y1 = UnitValue(boundsArr[1]).as('px');
        x2 = UnitValue(boundsArr[2]).as('px');
        y2 = UnitValue(boundsArr[3]).as('px');
        width = x2 - x1;
        height = y2 - y1;
        layerName = layers[i].name
        switch (layerName) {
            case "[LIMIT]":
                name = 'COMMON';
                break;
            case "[EXCLU]":
                name = 'COMMON';
                break;
            case "[ONLY]":
                name = 'COMMON';
                break;
            case "[NEW]":
                name = 'COMMON';
                break;
            default:
                fileIndex++;
                name = 'item_' + zeroSuppress(fileIndex, 3);
        }
        rectArr.push({ "name": name, "layerName": layerName, "x": x1, "y": y1, "cx": (x1 + ~~(width / 2)), "cy": (y1 + ~~(height / 2)), "w": width, "h": height });
        tmp = layers[i].duplicate(app.activeDocument, ElementPlacement.PLACEATBEGINNING); // 复制图层并移动到当前文档的layers[0]位置
        for (j = 1; j < layers.length; j++) {
            layers[j].visible = false;
        }
        switch (layerName) {
            case "[LIMIT]":
                break;
            case "[EXCLU]":
                break;
            case "[ONLY]":
                break;
            case "[NEW]":
                break;
            default:
                savePNG(exFolder + "/item/", psdName + '_' + name, boundsArr);
        }

        try {
            layers[0].remove();
        } catch (e) {
            
        }
        cmp.apply(); // 还原并删除备份
        cmp.remove();
    }
    return rectArr;
}

// 直接输出html代码
function exportHTML(rectArr, exFolder) {
    var psdName = app.activeDocument.name;
    psdName = psdName.replace(".psd", "");

    // 第一输出目标
    var htmlOut1 = new File(exFolder + "/" + psdName + ".html");
    htmlOut1.encoding = "UTF-8"; // 强制指定编码
    if (!htmlOut1.exists) { // 如果指定的路径没有相应文件
        htmlOut1.open("w"); // 写入模式
    }

    // 第二输出目标
    var htmlOut2 = new File(exFolder + "/all.html");
    htmlOut2.encoding = "UTF-8";
    if (!htmlOut2.exists) { // 如果指定路径没有
        htmlOut2.open("w"); // 写入模式
    } else {
        htmlOut2.open("a"); // 追加模式
    }

    var text = "<section class='swiper-slide'>\n\t<div class='pageZoom'>\n"; // 待写入内容的字符串
    var textBody = []; // 待写入内容缓存

    var imageTmp = "";
    var len = rectArr.length;
    var animateLib = ["fadeInDown", "fadeInLeft", "fadeInUp", "fadeInRight", "slideInDown", "slideInLeft", "slideInUp", "slideInRight", "zoomIn"]

    for (var i = 0; i < len; i++) {
        imageTmp = "\t\t<img class='imgBase swiper-lazy";
        if (rectArr[i].layerName !== "[BG]") {
            imageTmp += " ani";
        }
        switch (rectArr[i].layerName) {
            case "[LIMIT]":
                imageTmp += " infinite' data-src='";
                imageTmp += "assets/common/limit.png";
                break;
            case "[EXCLU]":
                imageTmp += " infinite' data-src='";
                imageTmp += "assets/common/exclu.png";
                break;
            case "[ONLY]":
                imageTmp += " infinite' data-src='";
                imageTmp += "assets/common/only.png";
                break;
            case "[NEW]":
                imageTmp += " infinite' data-src='";
                imageTmp += "assets/common/new.png";
                break;
            default:
                imageTmp += "' data-src='";
                imageTmp += "assets/item/" + psdName + '_' + rectArr[i].name + ".png";
                break;
        }
        imageTmp += "' style='left:" + rectArr[i].x + "px;top:" + rectArr[i].y + "px;'";
        if (rectArr[i].layerName !== "[BG]") {
            imageTmp += "\n\t\t\tswiper-animate-effect='";
            switch (rectArr[i].layerName) {
                case "[flipInX]":
                    imageTmp += "flipInX";
                    imageTmp += "' swiper-animate-duration='0.6s' swiper-animate-delay='0.3s'>";
                    break;
                case "[LIMIT]":
                case "[EXCLU]":
                case "[ONLY]":
                case "[NEW]":
                    imageTmp += "tada"
                    imageTmp += "' swiper-animate-duration='1.0s' swiper-animate-delay='0.8s'>";
                    break;
                default:
                    imageTmp += animateLib[~~(Math.random() * animateLib.length)]; // 随机一种动画效果
                    imageTmp += "' swiper-animate-duration='0.6s' swiper-animate-delay='0s'>";
                    break;
            }
        } else {
            imageTmp += ">"
        }
        textBody.push(imageTmp);
    }
    textBody.reverse(); // 颠倒顺序,按自然层级排列

    text += textBody.join('\n');
    text += "\n\t\t<img class='imgBase' src='assets/common/header.png' style='left:0;top:0;'>\n";
    text += "\t\t<img class='imgBase' data-touch='return' src='assets/common/btnGoback.png' style='left:72px;top:150px;pointer-events:all;'>\n";
    text += "\t</div>\n";
    text += "</section>\n";

    // 写入到文本文件里
    htmlOut1.write(text);
    htmlOut2.write(text);

    //文件写入成功后，关闭文件的输入流。
    htmlOut1.close();
    htmlOut2.close();

}

/* 主进程，出弹框提示选择输出路径，执行处理过程，完成后播放提示音 */
function Main() {
    try {
        var exFolder = Folder.selectDialog("请选择输出文件夹");
        if (exFolder != null) {
            var rect = processing(exFolder.fsName);
            exportHTML(rect, exFolder.fsName);
            app.beep(); //成功后播放提示音
            app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
        } else {
            alert("文件夹选择有误！");
        }
    } catch (e) {
        $.writeln("!!" + e.name + '-> Line ' + e.line + ': ' + e.message);
        alert("抱歉！执行时发生错误！\r\n" + "!!" + e.name + '-> Line ' + e.line + ': ' + e.message);
    }
}

Main();