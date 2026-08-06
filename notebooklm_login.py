"""
NotebookLM 로그인 자동화 스크립트

config.json (config.example.json 참고)에 저장된 Google 계정 정보로 브라우저를
자동 실행해 NotebookLM(https://notebooklm.google.com/)에 로그인하고, 로그인
세션(쿠키)을 파일로 저장해 이후 재사용할 수 있게 합니다.

사용법:
    1) cp config.example.json config.json 후 이메일/비밀번호 입력
    2) pip install -r requirements.txt && playwright install chromium
    3) python notebooklm_login.py            # 로그인 후 세션 저장
       python notebooklm_login.py --check    # 저장된 세션으로 로그인 상태만 확인

2단계 인증(2FA)이나 보안 확인이 뜨는 경우, headless=false 상태에서 브라우저
창이 열리므로 직접 완료하면 스크립트가 자동으로 로그인 완료를 감지합니다.
"""

import argparse
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

DEFAULT_CONFIG_PATH = "config.json"


def load_config(config_path: str) -> dict:
    path = Path(config_path)
    if not path.exists():
        sys.exit(
            f"설정 파일을 찾을 수 없습니다: {config_path}\n"
            f"config.example.json을 복사해 {config_path}을(를) 만들고 계정 정보를 입력하세요."
        )
    with path.open("r", encoding="utf-8") as f:
        config = json.load(f)

    if not config.get("email") or not config.get("password"):
        sys.exit("설정 파일에 email/password가 필요합니다.")

    config.setdefault("headless", False)
    config.setdefault("storage_state_path", "notebooklm_session.json")
    config.setdefault("login_timeout_ms", 120000)
    config.setdefault("notebooklm_url", "https://notebooklm.google.com/")
    return config


def is_logged_in(page, notebooklm_url: str) -> bool:
    """현재 컨텍스트가 로그인 상태로 NotebookLM에 접근 가능한지 확인합니다."""
    page.goto(notebooklm_url, wait_until="domcontentloaded")
    try:
        page.wait_for_url("**accounts.google.com/**", timeout=3000)
        return False  # 로그인 페이지로 리다이렉트됨
    except PlaywrightTimeoutError:
        pass
    return "notebooklm.google.com" in page.url


def perform_login(page, email: str, password: str, timeout_ms: int) -> None:
    """Google 로그인 폼(이메일 -> 비밀번호)을 채워 로그인을 진행합니다."""
    page.wait_for_selector('input[type="email"]', timeout=timeout_ms)
    page.fill('input[type="email"]', email)
    page.click("#identifierNext")

    page.wait_for_selector('input[type="password"]', state="visible", timeout=timeout_ms)
    time.sleep(1)  # 비밀번호 입력창 전환 애니메이션 대기
    page.fill('input[type="password"]', password)
    page.click("#passwordNext")


def wait_for_notebooklm(page, timeout_ms: int) -> bool:
    """로그인/2FA 완료 후 NotebookLM으로 돌아올 때까지 대기합니다."""
    deadline = time.time() + timeout_ms / 1000
    while time.time() < deadline:
        if "notebooklm.google.com" in page.url and "accounts.google.com" not in page.url:
            return True
        time.sleep(1)
    return False


def run_login(config: dict) -> bool:
    storage_state_path = Path(config["storage_state_path"])

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=config["headless"])
        context_kwargs = {}
        if storage_state_path.exists():
            context_kwargs["storage_state"] = str(storage_state_path)
        context = browser.new_context(**context_kwargs)
        page = context.new_page()

        if storage_state_path.exists() and is_logged_in(page, config["notebooklm_url"]):
            print(f"기존 세션({storage_state_path})으로 이미 로그인되어 있습니다.")
            context.storage_state(path=str(storage_state_path))
            browser.close()
            return True

        page.goto(config["notebooklm_url"], wait_until="domcontentloaded")

        if "accounts.google.com" not in page.url:
            print("이미 로그인된 상태입니다. 세션을 저장합니다.")
            context.storage_state(path=str(storage_state_path))
            browser.close()
            return True

        print("Google 로그인 페이지로 이동했습니다. 로그인을 진행합니다...")
        perform_login(page, config["email"], config["password"], config["login_timeout_ms"])

        print("2단계 인증/보안 확인이 필요할 수 있습니다. 완료될 때까지 대기합니다...")
        success = wait_for_notebooklm(page, config["login_timeout_ms"])

        if not success:
            browser.close()
            print(
                "제한 시간 내에 로그인이 완료되지 않았습니다. "
                "config.json의 login_timeout_ms 값을 늘리거나 headless를 false로 두고 "
                "브라우저에서 직접 인증을 완료해보세요.",
                file=sys.stderr,
            )
            return False

        context.storage_state(path=str(storage_state_path))
        print(f"로그인 성공. 세션을 저장했습니다: {storage_state_path}")
        browser.close()
        return True


def run_check(config: dict) -> bool:
    storage_state_path = Path(config["storage_state_path"])
    if not storage_state_path.exists():
        print(f"저장된 세션 파일이 없습니다: {storage_state_path}")
        return False

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=config["headless"])
        context = browser.new_context(storage_state=str(storage_state_path))
        page = context.new_page()
        logged_in = is_logged_in(page, config["notebooklm_url"])
        browser.close()

    print("로그인 상태: 유효함" if logged_in else "로그인 상태: 만료됨/유효하지 않음")
    return logged_in


def main():
    parser = argparse.ArgumentParser(description="NotebookLM 로그인 자동화")
    parser.add_argument(
        "-c", "--config", default=DEFAULT_CONFIG_PATH, help="설정 파일 경로 (기본값: config.json)"
    )
    parser.add_argument(
        "--check", action="store_true", help="로그인을 시도하지 않고 저장된 세션 상태만 확인합니다."
    )
    args = parser.parse_args()

    config = load_config(args.config)

    ok = run_check(config) if args.check else run_login(config)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
