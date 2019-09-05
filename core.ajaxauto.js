/**
 * Setting global ajax options
 */
$.ajaxSetup({
    abortOnRetry: true
});

/**
 * Automatically abort a request to the same URL
 *
 * @param json options
 * @param json originalOptions
 * @param xHTTPrequest jqXHR
 */
var currentRequests = {};
$.ajaxPrefilter(function(options, originalOptions, jqXHR) {
    if (options.abortOnRetry) {
        if (currentRequests[options.url]) {
            currentRequests[options.url].abort();
        }
        currentRequests[options.url] = jqXHR;
    }
});

/**
 * handles the actual transmission of Ajax data. It's mainly used for ajax upload in our core function
 *
 * @param json options
 * @param json origOptions
 * @param xHTTPrequest jqXHR
 */
$.ajaxTransport("json", function(options, origOptions, jqXHR) {
    if (!origOptions.files) {
        return;
    }

    if (typeof FormData === 'undefined') {
        var form = null,
            iframe = null,
            name = "iframe-" + $.now(),
            files = $(options.files).filter(":file:enabled"),
            markers = null;

        var cleanUp = function() {
            markers.replaceWith(function(idx) {
                return files.get(idx);
            });
            form.remove();
            iframe.attr("src", "javascript:false;").remove();
        };

        options.dataTypes.shift();

        if (files.length) {
            form = $("<form enctype='multipart\/form-data' method='post'><\/form>").hide().attr({action: options.url, target: name});

            if (typeof(origOptions.data) === "string" && origOptions.data.length > 0) {
                alert('Invalid data format');
            }
            $.each(origOptions.data || {}, function(name, value) {
                if ($.isPlainObject(value)) {
                    name = value.name;
                    value = value.value;
                }
                $("<input type='hidden'>").attr({name: name, value: value}).appendTo(form);
            });
            $("<input type='hidden' value='XMLHttpRequest' name='X-Requested-With'>").appendTo(form);

            markers = files.after(function(idx) {
                return $(this).clone().prop("disabled", true);
            }).next();
            files.appendTo(form);

            return {
                send: function(headers, completeCallback) {
                    iframe = $("<iframe src='javascript:false;' name='" + name + "' style='display:none'></iframe>");
                    iframe.bind("load", function() {
                        iframe.unbind("load").bind("load", function() {
                            var doc = this.contentWindow ? this.contentWindow.document : (this.contentDocument ? this.contentDocument : this.document),
                                root = doc.documentElement ? doc.documentElement : doc.body,
                                textarea = root.getElementsByTagName("textarea")[0],
                                type = textarea ? textarea.getAttribute("data-type") : null,
                                content = {
                            text: type ? textarea.value : root ? (root.textContent || root.innerText) : null
                            };
                            cleanUp();
                            completeCallback(200, "OK", content, type ? ("Content-Type: " + type) : null);
                        });
                        form[0].submit();
                    });
                    $("body").append(form, iframe);
                },
                abort: function() {
                    if (iframe !== null) {
                        iframe.unbind("load").attr("src", "javascript:false;");
                        cleanUp();
                    }
                }
            };
        }
    } else {
        var xhr = new XMLHttpRequest(),
            fd = new FormData(),
            uploadFiles = $(options.files).filter(":file:enabled"),
            filterFiles = new Array();

        for (var i = 0; i < uploadFiles.length; i++) {
            tempfile = uploadFiles[i].files[0];
            tempName = $(uploadFiles[i]).attr('name');
            if (tempfile) {
                filterFiles[tempName] = tempfile;
                fd.append(tempName, tempfile);
            }
        }
        //for (var name in filterFiles) {
        //    fd.append(name, filterFiles[name]);
        //}
        $.each(origOptions.data, function(i, field) {
            fd.append(field.name, field.value);
        });
        //$("<input type='hidden' value='XMLHttpRequest' name='X-Requested-With'>").appendTo(form);
        fd.append('X-Requested-With', 'XMLHttpRequest');

        return {
            send: function(headers, completeCallback) {
                xhr.open('POST', options.url, true);
                xhr.onload = function() {
                    var allResponseHeaders = 'Content-Length: ' + xhr.responseText.length + '\r\nContent-Type: ' + xhr.contentType;
                    var status = {
                        code: 200,
                        message: 'success'
                    };
                    var responses = {
                        text: xhr.responseText
                    }
                    if (this.status == 200) {
                        completeCallback(status.code, status.message, responses, allResponseHeaders);
                    }
                }
                xhr.send(fd);
            },
            abort: function() {
                xhr.abort();
            }
        };
    }
});

/**
 * ajax response success function
 *
 * @param string status: require options
 * @param string msg: response message
 * @param string redirect
 * @param int|null delay
 * @param json script
 * @param string|null callback
 * @param string|null context
 * @param json data
 *
 * @example
 *     $.ajaxJson({status: 'login/ok/other', msg: 'successfully!'})
 *     $.ajaxJson({status: 'login/ok/other', msg: 'successfully!', redirect: 'reload/referer/back/url', delay: 3})
 *     $.ajaxJson({status: 'login/ok/other', msg: 'successfully!', script: ''})
 *     $.ajaxJson({status: 'login/ok/other', msg: 'successfully!', callback: '', context: null, data:{}})
 *     $.ajaxJson({status: 'login/ok/other', msg: 'successfully!',  redirect: 'reload/referer/back/url', delay: 3, script: '', , callback: '', context: null, data:{}})
 */
$.fn.ajaxJson = function(json) {
    // status is requested
    if (!json || !json.status) {
        $.status('Invalid Request');
        return false;
    }

    var redirect = function() {
         if (!json.redirect) {
             return false;
         }
        if (json.redirect == 'reload') {
            window.location = window.location.href;
        }
        else if (json.redirect == 'referer') {
            if (window.referrer)
                window.location = window.referrer;
            else
                history.go(-1);
        }
        else if (json.redirect == 'back') {
            history.go(-1);
        }
        else {
            window.location = json.redirect;
        }
    };

    // status
    if(json.tipContext && json.msg) {
        tip = eval(json.tipContext);
        if (tip.attr('data-uiInput') && json.status == 'error') {
            tip.uiInput('setError', json.msg);
            return false;
        }
        if ($(this).data('tooltipStatus')) {
            $(this).data('tooltipStatus').close();
        }
        tipStatus = tip.tooltip(json.msg, {
            'class_name': "tips-" + json.status,
            'hover_active': false,
            'close_button': true,
            'context_position': 'left top',
            'target_position': "left bottom+10",
            'arrow_tip' : {
                direction : 'bottom',
                offset : '25',
                height : 10
            }
        });
        tipStatus.show();
        $(this).data('tooltipStatus', tipStatus);
        tip.focus();
        tip.on('click', function() {
            tip.close();
        });
    } else if (json.status == 'ok' || json.status == 'error') {
        var submitText = json.submit ? json.submit : 'OK';
        if (json.msg) {
            if (json.redirect) {
                $.alert(json.msg, redirect, {submit: submitText});
                return true;
            } else{
                $.alert(json.msg, {submit: submitText});
            }
        }
    }

    // script
    if (json.script) {
        eval(json.script);
    }

    // callback
    if (json.callback) {
        eval(json.callback).call(json.context || this, json.data);
    }

    // redirect
    if (json.redirect) {
        if (json.delay === undefined) {
            json.delay = json.msg ? 2 : 0;
        }
        setTimeout(redirect, json.delay * 1000);
    }
};


/**
 * this function is auto execute when ajax request error
 */
$.fn.ajaxError = function() {
};

/**
 * this function is auto execute when ajax request complate
 */
$.fn.ajaxComplete = function() {
};

/**
 * global ajax function which is auto select real ajax function type to sumbit the data
 *
 * @example
 *     $.ajaxAuto();
 *    $.ajaxAuto({
 *        url: "",
 *        "success": funciton(){},
 *        "error": function(){}
 *     });
 */
$.fn.ajaxAuto = function(settings) {
    if ("function" == typeof settings) {
        settings  = {
            success: settings
        };
    }
    var tagName = $(this).get(0).tagName;
    var tagName = $(this).get(0).tagName;
    if (tagName !== 'FORM') {
        $(this).ajaxLink(settings);
    } else if ($(this).attr('enctype') && $(this).attr('enctype') == 'multipart/form-data') {
        $(this).ajaxUpload(settings);
    } else {
        $(this).ajaxForm(settings);
    }
};

/**
 * ajaxLink is used for the link which has class ='ajax-link' will auto used ajax submit
 *
 * @example:
 *     $(".ajax-link").on("click", function(){$(this).ajaxLink(); return false;});
 */
$.fn.ajaxLink = function(settings) {
    if ("function" == typeof settings) {
        settings  = {
            success: settings
        };
    }
    settings = $.extend({}, $.ajaxSettings, settings);

    this.each(function() {

        var url = $(this).attr('href');
        if (url === undefined) {
            url = $(this).data('href');
        }
        if (url !== undefined) {
            settings.url = url;
        }
        var context = $(this);
        var disableContext = function(){context.attr('disabled', 'disabled').addClass('processing');};
        var enableContext = function(){context.removeAttr('disabled', 'disabled').removeClass('processing');};
        
        if (settings.dataType === undefined) {
            settings.dataType = 'json';
        }
        settings.beforeSend = function() {
            disableContext();
            settings.before && settings.before();
        };
        var $$ = $(this);

        var success = settings.success;
        settings.success = function(json) {
            $$.ajaxJson(json);
            success && success(json);
            if ((json.redirect === undefined) || !json.redirect) {
                enableContext();
            }
        };

        $.ajax(settings)
        .always(function(json) {
            settings.complete && settings.complete(json);
            if ((json.redirect === undefined) || !json.redirect) {
                enableContext();
            }
        });
    });
};

/**
 * ajaxForm is used for common form without upload
 * the form which add class ="ajax-from" will auto used ajax submit
 *
 * @example:
 *  $(".ajax-form").on("submit", function(){$(this).ajaxForm()};
 */
$.fn.ajaxForm = function(settings) {
    if ("function" == typeof settings) {
        settings  = {
            success: settings
        };
    }
    settings = $.extend({}, $.ajaxSettings, settings);

    var context = $(this);
    var formBtn = context.find('button[type=submit]').eq(0);
    var disableBtn = function() {formBtn.attr('disabled', 'disabled').addClass('processing');};
    var enableBtn = function() {formBtn.removeAttr('disabled').removeClass('processing');};
    if (settings.context) {
        context = settings.context;
    }

    $.ajax({
        type: $(this).attr('method'),
        url: $(this).attr('action'),
        data: $(this).serialize(),
        dataType: settings.dataType ? settings.dataType : 'json',
        beforeSend: function(){
            disableBtn();
            settings.before && settings.before();
        }
    })
    .done(function(json) {
        context.ajaxJson(json);
        settings.success && settings.success(json);
        if ((json.redirect === undefined) || !json.redirect) {
            enableBtn();
        }
    })
    .fail(function() {
        context.ajaxError();
        settings.error && settings.error();
    })
    .always(function(json) {
        context.ajaxComplete();
        settings.complete && settings.complete(json);
        if ((json.redirect === undefined) || !json.redirect) {
            enableBtn();
        }
    });
};

/**
 * ajaxUpload is used for the form with upload
 * the form which add class ="ajax-from" and attr entype will auto used ajax submit
 *
 * @example:
 *          $(".ajax-upload").on("submit", function(){$(this).ajaxUpload()};;
 */
$.fn.ajaxUpload = function(settings) {
    if ("function" == typeof settings) {
        settings  = {
            success: settings
        };
    }
    settings = $.extend({}, $.ajaxSettings, settings);

    var context = this;
    var formBtn = $(context).find('button[type=submit]').eq(0);
    var disableBtn = function() {formBtn.attr('disabled', 'disabled');};
    var enableBtn = function() {formBtn.removeAttr('disabled');};
    var formData = settings.data;
    if (settings.context) {
        context = settings.context;
    }

    $.ajax({
        url: this.attr("action"),
        type: 'POST',
        files: formData ? '' : $(":file", this),
        data: formData ? formData : this.serializeArray(),
        dataType: 'json',
        contentType: false,
        processData: false,
        beforeSend: function() {
            disableBtn();
            settings.before && settings.before();
        }
    })
    .done(function(json) {
        if (typeof json == 'string') {
            json = eval("(" + json + ")");
        }
        context.ajaxJson(json);
        settings.success && settings.success(json);
        if ((json.redirect === undefined) || !json.redirect) {
            enableBtn();
        }
    })
    .fail(function() {
        context.ajaxError();
        settings.error && settings.error();
    })
    .always(function() {
        context.ajaxComplete();
        settings.complete && settings.complete(json);
    });
};
