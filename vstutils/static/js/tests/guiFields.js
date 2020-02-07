/**
 * Function creates test, that inits guiField instance
 * and checks work of it's methods: toInner() and toRepresent().
 * This function check work of guiField instance - JS object, not Vue component.
 * @param {object} options Object with init options of guiField.
 * @param {array} values Array of objects with input data and output values for methods.
 */
function addTestForGuiFieldInstanceMethods(options, values) {
    syncQUnit.addTest('guiFields.' + options.format, function(assert) {
        let field = new guiFields[options.format](options);

        for(let index in values) {
            let item = values[index];

            for(let method in item.output) {
                assert.ok(
                    deepEqual(field[method](item.input), item.output[method]) === true,
                    'guiFields.' + options.format + '.' + method + '()',
                );
            }
        }
    });

}

/**
 * Common testing of guiFields instances.
 * Testing of toInner(), toRepresent() methods.
 */
window.qunitTestsArray['guiFields[field].{toInner, toRepresent}()'] = {
    test: function() {
        let base_opt = {
            name: 'test_field',
        };
        let default_string_values =  [
            {
                input: {test_field: 'test-string'},
                output: {
                    toInner: 'test-string',
                    toRepresent: 'test-string',
                },
            },
            {
                input: {test_field: undefined},
                output: {
                    toInner: undefined,
                    toRepresent: undefined,
                },
            },
            {
                input: {test_field: ''},
                output: {
                    toInner: '',
                    toRepresent: '',
                },
            },
        ];
        let default_number_values = [
            {
                input: {test_field: '123'},
                output: {
                    toInner: 123,
                    toRepresent: '123',
                },
            },
            {
                input: {test_field: 321},
                output: {
                    toInner: 321,
                    toRepresent: 321,
                },
            },
        ];
        let default_fk_values = [
            {
                input: {test_field: 1},
                output: {
                    toInner: 1,
                    toRepresent: 1,
                },
            },
            {
                input: {test_field: {value: 1,}},
                output: {
                    toInner: 1,
                    toRepresent: undefined,
                },
            },
            {
                input: {test_field: {prefetch_value: 'qwerty'}},
                output: {
                    toInner: undefined,
                    toRepresent: 'qwerty',
                },
            },
            {
                input: {test_field: {value: 1, prefetch_value: 'qwerty'}},
                output: {
                    toInner: 1,
                    toRepresent: 'qwerty',
                },
            },
        ];

        let fields_constructor = {
            string: {
                options: {format: 'string'},
                values: default_string_values,
            },
            textarea: {
                options: {format: 'textarea'},
                values: default_string_values,
            },
            integer: {
                options: {format: 'integer'},
                values: default_number_values,
            },
            int32: {
                options: {format: 'int32'},
                values: default_number_values,
            },
            int64: {
                options: {format: 'int64'},
                values: default_number_values,
            },
            double: {
                options: {format: 'double'},
                values: default_number_values,
            },
            number: {
                options: {format: 'number'},
                values: default_number_values,
            },
            float: {
                options: {format: 'float'},
                values: default_number_values,
            },
            boolean: {
                options: {format: 'boolean'},
                values: [
                    {
                        input: {test_field: true},
                        output: {
                            toInner: true,
                            toRepresent: true,
                        }
                    },
                    {
                        input: {test_field: false},
                        output: {
                            toInner: false,
                            toRepresent: false,
                        }
                    },
                    {
                        input: {test_field: 'true'},
                        output: {
                            toInner: true,
                            toRepresent: true,
                        }
                    },
                    {
                        input: {test_field: 'false'},
                        output: {
                            toInner: false,
                            toRepresent: false,
                        }
                    },
                    {
                        input: {test_field: 'True'},
                        output: {
                            toInner: true,
                            toRepresent: true,
                        }
                    },
                    {
                        input: {test_field: 'False'},
                        output: {
                            toInner: false,
                            toRepresent: false,
                        }
                    },
                    {
                        input: {test_field: 1},
                        output: {
                            toInner: true,
                            toRepresent: true,
                        }
                    },
                    {
                        input: {test_field: 0},
                        output: {
                            toInner: false,
                            toRepresent: false,
                        }
                    },
                    {
                        input: {test_field: undefined},
                        output: {
                            toInner: undefined,
                            toRepresent: undefined,
                        }
                    },
                    {
                        input: {test_field: ''},
                        output: {
                            toInner: undefined,
                            toRepresent: undefined,
                        }
                    },
                    {
                        input: {test_field: '1212'},
                        output: {
                            toInner: undefined,
                            toRepresent: undefined,
                        }
                    },
                ],
            },
            choices: {
                options: {format: 'choices', enum: ['abc', '123']},
                values: [
                    {
                        input: {test_field: 'abc'},
                        output: {
                            toInner: 'abc',
                            toRepresent: 'abc',
                        },
                    },
                    {
                        input: {test_field: '123'},
                        output: {
                            toInner: '123',
                            toRepresent: '123',
                        },
                    },
                ],
            },
            autocomplete: {
                options: {format: 'autocomplete', enum: ['abc', '123']},
                values: [
                    {
                        input: {test_field: 'abc'},
                        output: {
                            toInner: 'abc',
                            toRepresent: 'abc',
                        },
                    },
                    {
                        input: {test_field: '123qwe'},
                        output: {
                            toInner: '123qwe',
                            toRepresent: '123qwe',
                        },
                    },
                ],
            },
            password: {
                options: {format: 'password'},
                values: default_string_values,
            },
            file: {
                options: {format: 'file'},
                values: default_string_values,
            },
            secretfile: {
                options: {format: 'secretfile'},
                values: default_string_values,
            },
            text_paragraph: {
                options: {format: 'text_paragraph'},
                values: default_string_values,
            },
            plain_text: {
                options: {format: 'plain_text'},
                values: default_string_values,
            },
            html: {
                options: {format: 'html'},
                values: default_string_values,
            },
            date: {
                options: {format: 'date'},
                values: [
                    {
                        input: {test_field: '2020-12-27'},
                        output: {
                            toInner: '2020-12-27',
                            toRepresent: '2020-12-27',
                        },
                    },
                ],
            },
            date_time: {
                options: {format: 'date_time'},
                values: [
                    {
                        input: {test_field: '2019-05-08T07:08:07'},
                        output: {
                            toInner: '2019-05-08T07:08:07' + (app.api.getTimeZone() == 'UTC' ? 'Z' : moment.tz(app.api.getTimeZone()).format('Z')),
                            toRepresent: moment(moment.tz('2019-05-08T07:08:07', app.api.getTimeZone())).tz(moment.tz.guess()).format('YYYY-MM-DD') + 'T' +
                             moment(moment.tz('2019-05-08T07:08:07', app.api.getTimeZone())).tz(moment.tz.guess()).format('HH:mm'),
                        },
                    }
                ],
            },
            uptime: {
                options: {format: 'uptime'},
                values: [
                    {
                        input: {test_field: 10},
                        output: {
                            toInner: 10,
                            toRepresent: '00:00:10',
                        },
                    },
                    {
                        input: {test_field: 100},
                        output: {
                            toInner: 100,
                            toRepresent: '00:01:40',
                        },
                    },
                    {
                        input: {test_field: 100100},
                        output: {
                            toInner: 100100,
                            toRepresent: '01d 03:48:20',
                        },
                    },
                    {
                        input: {test_field: 10010010},
                        output: {
                            toInner: 10010010,
                            toRepresent: '03m 23d 20:33:30',
                        },
                    },
                    {
                        input: {test_field: 100100100},
                        output: {
                            toInner: 100100100,
                            toRepresent: '03y 02m 01d 13:35:00',
                        },
                    },
                    {
                        input: {test_field: 100100100},
                        output: {
                            toInner: 100100100,
                            toRepresent: '03y 02m 01d 13:35:00',
                        },
                    },
                ],
            },
            time_interval: {
                options: {format: 'time_interval'},
                values: [
                    {
                        input: {test_field: 15000},
                        output: {
                            toInner: 15000,
                            toRepresent: 15,
                        },
                    },
                ],
            },
            crontab: {
                options: {format: 'crontab'},
                values: [
                    {
                        input: {test_field: '* * * */2 *'},
                        output: {
                            toInner: '* * * */2 *',
                            toRepresent: '* * * */2 *',
                        },
                    },
                    {
                        input: {test_field: undefined},
                        output: {
                            toInner: '* * * * *',
                            toRepresent: '* * * * *',
                        },
                    },
                ],
            },
            json: {
                options: {format: 'json'},
                values: [
                    {
                        input: {test_field: {a: 123, b: 'qwerty', c: true}},
                        output: {
                            toInner: {a: 123, b: 'qwerty', c: true},
                            toRepresent: {a: 123, b: 'qwerty', c: true},
                        },
                    },
                ],
            },
            api_object: {
                options: {format: 'api_object'},
                values: [
                    {
                        input: {test_field: {id:1, name: '123'}},
                        output: {
                            toInner: {id:1, name: '123'},
                            toRepresent: {id:1, name: '123'},
                        },
                    }
                ],
            },
            fk: {
                options: {format: 'fk'},
                values: default_fk_values,
            },
            fk_autocomplete: {
                options: {format: 'fk_autocomplete'},
                values: default_fk_values,
            },
            fk_multi_autocomplete: {
                options: {format: 'fk_multi_autocomplete'},
                values: default_fk_values,
            },
            color: {
                options: {format: 'color'},
                values: [
                    {
                        input: {test_field: '#fefefe'},
                        output: {
                            toInner: '#fefefe',
                            toRepresent: '#fefefe',
                        },
                    },
                    {
                        input: {test_field: undefined},
                        output: {
                            toInner: '#000000',
                            toRepresent: '#000000',
                        },
                    },
                ],
            },
            inner_api_object: {
                options: {format: 'inner_api_object'},
                values: [
                    {
                        input: {test_field: {a: {b:1, c: 2}, d:{e:3, f: 4}}},
                        output: {
                            toInner: {a: {b:1, c: 2}, d:{e:3, f: 4}},
                            toRepresent: {a: {b:1, c: 2}, d:{e:3, f: 4}},
                        },
                    },
                ],
            },
            api_data: {
                options: {format: 'api_data'},
                values: default_string_values,
            },
            dynamic: {
                options: {
                    format: 'dynamic',
                    additionalProperties:{
                        types:{abc:'boolean'},
                        field: ['parent_field'],
                    },
                },
                values: [
                    {
                        input: {parent_field: 'abc', test_field: 'True'},
                        output: {
                            toInner: true,
                            toRepresent: true,
                        },
                    },
                ],
            },
            dynamic_2: {
                options: {
                    format: 'dynamic',
                    additionalProperties:{
                        field: ['parent_field'],
                        callback: (parent_values) => {
                            return {
                                format: 'boolean',
                            }
                        },
                    },
                },
                values: [
                    {
                        input: {parent_field: 'abc', test_field: '0'},
                        output: {
                            toInner: false,
                            toRepresent: false,
                        },
                    },
                ],
            },
            hidden: {
                options: {format: 'hidden'},
                values: default_string_values,
            },
            form: {
                options: {
                    format: 'form',
                    form: {
                        string_field: {
                            format: 'string',
                        },
                        number_field: {
                            format: 'number',
                        },
                        boolean_field: {
                            format: 'boolean',
                        },
                        choices_field: {
                            format: 'choices',
                            enum: ['abc', 'def'],
                        },
                    },
                },
                values: [
                    {
                        input: {
                            test_field: {
                                string_field: 'qwerty',
                                number_field: '123',
                                boolean_field: 'True',
                                choices_field: 'def',
                            },
                        },
                        output: {
                            toInner: {
                                string_field: 'qwerty',
                                number_field: 123,
                                boolean_field: true,
                                choices_field: 'def',
                            },
                            toRepresent: {
                                string_field: 'qwerty',
                                number_field: 123,
                                boolean_field: true,
                                choices_field: 'def',
                            },
                        },
                    },
                ],
            },
            button: {
                options: {format: 'button'},
                values: default_string_values,
            },
            string_array: {
                options: {format: 'string_array'},
                values: default_string_values,
            },
            string_id: {
                options: {format: 'string_id'},
                values:  [
                    {
                        input: {test_field: 'test-value-test'},
                        output: {
                            toInner: 'test_value_test',
                            toRepresent: 'test_value_test',
                        },
                    },
                    {
                        input: {test_field: undefined},
                        output: {
                            toInner: undefined,
                            toRepresent: undefined,
                        },
                    },
                    {
                        input: {test_field: ''},
                        output: {
                            toInner: '',
                            toRepresent: '',
                        },
                    },
                ],
            },
        };

        for(let key in fields_constructor) {
            let item = fields_constructor[key];
            addTestForGuiFieldInstanceMethods($.extend(true, {}, base_opt, item.options), item.values);
        }
    }
};