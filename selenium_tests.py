from time import sleep
from django.test import LiveServerTestCase
from django.contrib.auth import get_user_model
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.common import exceptions


class SeleniumTestCase(LiveServerTestCase):
    host = 'localhost'
    port = 8888

    def setUp(self):
        options = webdriver.ChromeOptions()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        self.selenium = webdriver.Chrome(options=options)
        User = get_user_model()
        self.user = User.objects.create_superuser('admin', 'admin@example.com', 'admin')
        super(SeleniumTestCase, self).setUp()

    def tearDown(self):
        self.selenium.quit()
        super(SeleniumTestCase, self).tearDown()

    def test_qunit(self):
        selenium = self.selenium
        # Opening the link we want to test
        selenium.get('http://localhost:8888/')
        login = selenium.find_element_by_name('username')
        login.send_keys('admin')
        password = selenium.find_element_by_name('password')
        password.send_keys('admin')
        submit = selenium.find_element_by_id('login_button')
        submit.send_keys(Keys.RETURN)
        sleep(3)
        selenium.execute_script('window.loadQUnitTests()')
        saveReportObj = None
        for _ in range(300):
            try:
                saveReportObj = selenium.find_element_by_id('qunit-saveReport')
            except exceptions.NoSuchElementException:
                sleep(1)
            else:
                break
        self.assertNotEqual(saveReportObj, None)
