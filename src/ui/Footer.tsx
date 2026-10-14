import styles from "./Footer.module.css";

const SOURCE_URL = "https://github.com/lharzenetter/checkbox-simulator";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.disclaimer}>
        Inoffizieller Trainingssimulator – nicht von Pölz. Ersetzt keine
        Ausbildung am Originalgerät.
      </p>
      <p className={styles.meta}>
        <a className={styles.link} href={SOURCE_URL}>
          Quellcode
        </a>{" "}
        · v{import.meta.env.APP_VERSION}
      </p>
    </footer>
  );
}
